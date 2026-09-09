import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Save,
  Store,
  CreditCard,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  Globe,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Zap,
  Database,
  Radio,
  Check,
  Palette,
  Megaphone,
  Tag,
  Truck,
  Sparkles,
  Mail,
  Phone,
  Coins,
  FileText,
  Clock,
  HelpCircle,
  CheckCircle,
  Gift,
  MessageSquare,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { STORE_CONFIG } from '../../constants/config';
import { adminService } from '../../services/adminService';
import { PaymentGatewayConfig } from '../../types';
import { StoreBrandingSettings } from '../../components/admin/StoreBrandingSettings';
import { PromoBannerSettings } from '../../components/admin/PromoBannerSettings';
import { CouponsManagementSettings } from '../../components/admin/CouponsManagementSettings';
import { PaymentGatewaysSettings } from '../../components/admin/PaymentGatewaysSettings';
import { ReferralsManagementSettings } from '../../components/admin/ReferralsManagementSettings';
import { InvoiceSettingsConfigCard } from '../../components/admin/InvoiceSettingsConfigCard';
import { StoreTaxSettingsCard } from '../../components/admin/StoreTaxSettingsCard';

/**
 * Authentic Google "G" Brand Icon for Admin UI
 */
const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

type SettingsTab = 'general' | 'invoices' | 'coupons' | 'referrals' | 'branding' | 'banner' | 'payments';

export const AdminSettingsPage: React.FC = () => {
  const { showToast, reloadGeneralSettings, updateGeneralSettings } = useShop();
  const { isAdmin, setIsGoogleAuthEnabled } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') as SettingsTab | null;

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    if (
      activeTabParam === 'invoices' ||
      activeTabParam === 'payments' ||
      activeTabParam === 'referrals' ||
      activeTabParam === 'branding' ||
      activeTabParam === 'banner' ||
      activeTabParam === 'coupons'
    ) {
      return activeTabParam;
    }
    return 'general';
  });

  useEffect(() => {
    const tab = searchParams.get('tab') as SettingsTab | null;
    if (tab && ['general', 'invoices', 'coupons', 'referrals', 'branding', 'banner', 'payments'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // General Store Settings State
  const [storeName, setStoreName] = useState<string>(STORE_CONFIG.STORE_NAME);
  const [currency, setCurrency] = useState<string>(STORE_CONFIG.STORE_CURRENCY);
  const [deliveryFee, setDeliveryFee] = useState<string>(String(STORE_CONFIG.DELIVERY_FEE));
  const [expressDeliveryFee, setExpressDeliveryFee] = useState<string>('120');
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<string>(
    String(STORE_CONFIG.FREE_DELIVERY_THRESHOLD)
  );
  const [enableFreeDeliveryThreshold, setEnableFreeDeliveryThreshold] = useState<boolean>(true);
  const [estimatedStandardDays, setEstimatedStandardDays] = useState<string>('2 - 4 Business Days');
  const [estimatedExpressDays, setEstimatedExpressDays] = useState<string>('1 - 2 Business Days');
  const [shippingNotes, setShippingNotes] = useState<string>(
    'Nationwide door-to-door courier via The Courier Guy & Aramex.'
  );
  const [contactEmail, setContactEmail] = useState<string>(STORE_CONFIG.CONTACT_EMAIL);
  const [contactPhone, setContactPhone] = useState<string>('+27 (0)11 892 4000');
  const [whatsappSupport, setWhatsappSupport] = useState<string>(STORE_CONFIG.WHATSAPP_SUPPORT);
  const [supportHeading, setSupportHeading] = useState<string>('Need help with an order?');
  const [supportSubtext, setSupportSubtext] = useState<string>('Contact KUD Store support team via email or WhatsApp');
  const [storeDescription, setStoreDescription] = useState<string>(
    'Premium South African marketplace delivering beauty, technology, home goods, and lifestyle products.'
  );
  const [enableGoogleAuth, setEnableGoogleAuth] = useState<boolean>(true);
  const [isTogglingGoogleAuth, setIsTogglingGoogleAuth] = useState<boolean>(false);
  const [googleAuthFeedback, setGoogleAuthFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Validation State
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isGeneralTouched, setIsGeneralTouched] = useState<boolean>(false);

  // Instant toggle handler for isGoogleAuthEnabled setting
  const handleInstantGoogleAuthToggle = async (newVal: boolean) => {
    const prevVal = enableGoogleAuth;
    setEnableGoogleAuth(newVal);
    setIsTogglingGoogleAuth(true);
    setGoogleAuthFeedback(null);

    try {
      const res = await adminService.setGoogleAuthEnabled(newVal);
      if (res.success) {
        setIsGoogleAuthEnabled(newVal);
        await reloadGeneralSettings();
        setGoogleAuthFeedback({
          type: 'success',
          message: newVal
            ? 'Google OAuth sign-in is now enabled and visible on customer login & registration pages.'
            : 'Google OAuth sign-in is now disabled and hidden from customer login & registration pages.',
        });
        showToast(
          newVal
            ? 'Google sign-in enabled for customer dashboard'
            : 'Google sign-in disabled for customer dashboard',
          'success'
        );
      } else {
        setEnableGoogleAuth(prevVal);
        setGoogleAuthFeedback({
          type: 'error',
          message: res.error || 'Failed to update Google auth setting in database. Reverted back.',
        });
        showToast(res.error || 'Failed to update Google authentication setting', 'error');
      }
    } catch (err: any) {
      setEnableGoogleAuth(prevVal);
      setGoogleAuthFeedback({
        type: 'error',
        message: err?.message || 'Network error updating Google auth setting.',
      });
      showToast('Error updating Google authentication setting', 'error');
    } finally {
      setIsTogglingGoogleAuth(false);
    }
  };

  // Load settings from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      setIsLoadingSettings(true);
      try {
        const genConfig = await adminService.getGeneralSettings();

        if (isMounted && genConfig) {
          setStoreName(genConfig.storeName || STORE_CONFIG.STORE_NAME);
          setCurrency(genConfig.currency || STORE_CONFIG.STORE_CURRENCY);
          setDeliveryFee(String(genConfig.deliveryFee ?? STORE_CONFIG.DELIVERY_FEE));
          setExpressDeliveryFee(String(genConfig.expressDeliveryFee ?? 120));
          setFreeDeliveryThreshold(String(genConfig.freeDeliveryThreshold ?? STORE_CONFIG.FREE_DELIVERY_THRESHOLD));
          setEnableFreeDeliveryThreshold(genConfig.enableFreeDeliveryThreshold ?? true);
          setEstimatedStandardDays(genConfig.estimatedStandardDays || '2 - 4 Business Days');
          setEstimatedExpressDays(genConfig.estimatedExpressDays || '1 - 2 Business Days');
          setShippingNotes(genConfig.shippingNotes || 'Nationwide door-to-door courier via The Courier Guy & Aramex.');
          setContactEmail(genConfig.contactEmail || STORE_CONFIG.CONTACT_EMAIL);
          setContactPhone(genConfig.contactPhone || '+27 (0)11 892 4000');
          setWhatsappSupport(genConfig.whatsappSupport || STORE_CONFIG.WHATSAPP_SUPPORT);
          setSupportHeading(genConfig.supportHeading || 'Need help with an order?');
          setSupportSubtext(genConfig.supportSubtext || 'Contact KUD Store support team via email or WhatsApp');
          setStoreDescription(genConfig.storeDescription || '');
          setEnableGoogleAuth(genConfig.enableGoogleAuth ?? true);
        }
      } catch (err) {
        console.warn('Error fetching settings from Supabase:', err);
      } finally {
        if (isMounted) setIsLoadingSettings(false);
      }
    }

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'general' ? {} : { tab });
  };

  // Real-time Field Validation Helpers
  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  const isValidPhone = (val: string) => val.trim().replace(/\D/g, '').length >= 8;
  const isValidPositiveNumber = (val: string) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && val.trim() !== '';
  };

  const isStoreNameValid = storeName.trim().length >= 2;
  const isCurrencyValid = currency.trim().length >= 1;
  const isDeliveryFeeValid = isValidPositiveNumber(deliveryFee);
  const isExpressFeeValid = isValidPositiveNumber(expressDeliveryFee);
  const isThresholdValid = isValidPositiveNumber(freeDeliveryThreshold);
  const isStandardDaysValid = estimatedStandardDays.trim().length >= 2;
  const isExpressDaysValid = estimatedExpressDays.trim().length >= 2;
  const isEmailValid = isValidEmail(contactEmail);
  const isPhoneValid = isValidPhone(contactPhone);

  const isGeneralFormValid =
    isStoreNameValid &&
    isCurrencyValid &&
    isDeliveryFeeValid &&
    isExpressFeeValid &&
    isThresholdValid &&
    isEmailValid &&
    isPhoneValid;

  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneralTouched(true);

    if (!isGeneralFormValid) {
      showToast('Please fix the highlighted invalid fields before saving.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const parsedDelivery = parseFloat(deliveryFee);
      const parsedExpress = parseFloat(expressDeliveryFee);
      const parsedThreshold = parseFloat(freeDeliveryThreshold);

      const payload = {
        storeName: storeName.trim(),
        currency: currency.trim() || 'R',
        deliveryFee: parsedDelivery,
        expressDeliveryFee: isNaN(parsedExpress) || parsedExpress < 0 ? 120 : parsedExpress,
        freeDeliveryThreshold: parsedThreshold,
        enableFreeDeliveryThreshold,
        estimatedStandardDays: estimatedStandardDays.trim(),
        estimatedExpressDays: estimatedExpressDays.trim(),
        shippingNotes: shippingNotes.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        whatsappSupport: whatsappSupport.trim(),
        supportHeading: supportHeading.trim(),
        supportSubtext: supportSubtext.trim(),
        storeDescription: storeDescription.trim(),
        enableGoogleAuth,
        isGoogleAuthEnabled: enableGoogleAuth,
      };

      const res = await updateGeneralSettings(payload);

      if (res.success) {
        const reloaded = await adminService.getGeneralSettings();
        if (reloaded) {
          setStoreName(reloaded.storeName);
          setCurrency(reloaded.currency);
          setDeliveryFee(String(reloaded.deliveryFee));
          setExpressDeliveryFee(String(reloaded.expressDeliveryFee ?? 120));
          setFreeDeliveryThreshold(String(reloaded.freeDeliveryThreshold));
          setEnableFreeDeliveryThreshold(reloaded.enableFreeDeliveryThreshold ?? true);
          setEstimatedStandardDays(reloaded.estimatedStandardDays || '2 - 4 Business Days');
          setEstimatedExpressDays(reloaded.estimatedExpressDays || '1 - 2 Business Days');
          setShippingNotes(reloaded.shippingNotes || 'Nationwide door-to-door courier via The Courier Guy & Aramex.');
          setContactEmail(reloaded.contactEmail);
          setContactPhone(reloaded.contactPhone);
          setWhatsappSupport(reloaded.whatsappSupport || STORE_CONFIG.WHATSAPP_SUPPORT);
          setSupportHeading(reloaded.supportHeading || 'Need help with an order?');
          setSupportSubtext(reloaded.supportSubtext || 'Contact KUD Store support team via email or WhatsApp');
          setStoreDescription(reloaded.storeDescription);
          const isGoogleAuth = reloaded.isGoogleAuthEnabled ?? reloaded.enableGoogleAuth ?? true;
          setEnableGoogleAuth(isGoogleAuth);
          setIsGoogleAuthEnabled(isGoogleAuth);
        }
        await reloadGeneralSettings();
        showToast('Store settings & delivery logistics updated successfully.', 'success');
      } else {
        showToast(res.error || 'Failed to save settings to database.', 'error');
      }
    } catch (err: any) {
      console.error('Error saving general settings to Supabase:', err);
      showToast(err?.message || 'Error occurred while saving settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <span>Store & Administration Settings</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage marketplace profile, delivery fees, discount coupons, and payment gateway infrastructure.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center flex-wrap bg-gray-100/90 p-1.5 rounded-2xl gap-1 border border-gray-200/60 shadow-xs">
          <button
            onClick={() => handleTabChange('general')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-white text-gray-900 shadow-xs ring-1 ring-black/5'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-[#ff6452]" />
            <span>Store Profile & Logistics</span>
          </button>

          <button
            onClick={() => handleTabChange('invoices')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-[#ff6452] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Invoices & Receipts</span>
          </button>

          <button
            onClick={() => handleTabChange('coupons')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'coupons'
                ? 'bg-[#ff6452] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Coupons & Discounts</span>
          </button>

          <button
            onClick={() => handleTabChange('referrals')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'referrals'
                ? 'bg-[#ff6452] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Referrals & Loyalty</span>
          </button>

          <button
            onClick={() => handleTabChange('branding')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'branding'
                ? 'bg-[#ff6452] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Logo & Branding</span>
          </button>

          <button
            onClick={() => handleTabChange('banner')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'banner'
                ? 'bg-[#ff6452] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Promo Banner</span>
          </button>

          <button
            onClick={() => handleTabChange('payments')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-[#ff6452] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payment Gateways</span>
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-md font-extrabold flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" />
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GENERAL STORE CONFIGURATION & LOGISTICS (GROUPED IN LOGICAL CARDS) */}
      {/* ========================================================================= */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* VAT & SALES TAX CONFIGURATION (DIRECT SUPABASE PERSISTENCE) */}
          <StoreTaxSettingsCard />

          <form onSubmit={handleSaveGeneralSettings} className="space-y-6">
          {/* CARD 1: STORE IDENTITY & PROFILE */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#ff6452] flex items-center justify-center flex-shrink-0 font-bold border border-orange-100">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 tracking-tight">Store Identity & Profile</h3>
                  <p className="text-xs text-gray-500">
                    Public marketplace brand name, default transaction currency, and customer-facing store overview.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex text-[11px] font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                Public Profile
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Store Name Input with Validation */}
              <div className="sm:col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <span>Store Name</span>
                    <span className="text-[10px] font-extrabold text-rose-500">*</span>
                  </label>
                  {isStoreNameValid ? (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Valid Title
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Required (min 2 chars)
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => {
                      setStoreName(e.target.value);
                      setIsGeneralTouched(true);
                    }}
                    placeholder="e.g. KUD STORE"
                    className={`w-full pl-4 pr-10 py-3 rounded-2xl text-xs font-bold transition-all focus:outline-none ${
                      isStoreNameValid
                        ? 'bg-emerald-50/20 border border-emerald-300 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                        : 'bg-rose-50/30 border border-rose-300 text-rose-950 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
                    }`}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isStoreNameValid ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  Displayed in navigation header, SEO metadata tags, and checkout receipt headers.
                </p>
              </div>

              {/* Currency Symbol Input with Validation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-gray-500" />
                    <span>Currency Symbol</span>
                    <span className="text-[10px] font-extrabold text-rose-500">*</span>
                  </label>
                  {isCurrencyValid ? (
                    <span className="text-[11px] font-bold text-emerald-600">Active: {currency}</span>
                  ) : (
                    <span className="text-[11px] font-bold text-rose-600">Required</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value);
                      setIsGeneralTouched(true);
                    }}
                    placeholder="R"
                    maxLength={4}
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-black text-center transition-all focus:outline-none ${
                      isCurrencyValid
                        ? 'bg-emerald-50/20 border border-emerald-300 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                        : 'bg-rose-50/30 border border-rose-300 text-rose-950 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-gray-500 text-center">e.g. R, $, €, £</p>
              </div>
            </div>

            {/* Store Bio / Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-gray-500" />
                  <span>Store Biography & Marketplace Statement</span>
                </label>
                <span className="text-[10px] font-bold text-gray-400">
                  {storeDescription.length} characters
                </span>
              </div>
              <textarea
                rows={3}
                value={storeDescription}
                onChange={(e) => {
                  setStoreDescription(e.target.value);
                  setIsGeneralTouched(true);
                }}
                placeholder="Brief summary of store mission, catalog, and offerings..."
                className="w-full p-4 bg-gray-50/80 border border-gray-200 rounded-2xl text-xs font-medium text-gray-800 transition-all focus:bg-white focus:outline-none focus:border-[#ff6452] focus:ring-2 focus:ring-[#ff6452]/10"
              />
            </div>
          </div>

          {/* CARD 2: COURIER RATES & DISPATCH FEES */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold border border-blue-100">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 tracking-tight">
                    Logistics & Courier Delivery Rates
                  </h3>
                  <p className="text-xs text-gray-500">
                    Control flat delivery fees, express courier surcharges, and free delivery thresholds applied at checkout.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-600" /> Live in Cart
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Standard Delivery Fee */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                    <span>Standard Delivery Fee ({currency})</span>
                    <span className="text-[10px] font-extrabold text-rose-500">*</span>
                  </label>
                  {isDeliveryFeeValid ? (
                    <span className="text-[11px] font-bold text-emerald-600">
                      {parseFloat(deliveryFee) === 0 ? 'Free Shipping (0)' : `Charge: ${currency}${deliveryFee}`}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-rose-600">Invalid amount</span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                    {currency}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={deliveryFee}
                    onChange={(e) => {
                      setDeliveryFee(e.target.value);
                      setIsGeneralTouched(true);
                    }}
                    placeholder="65"
                    className={`w-full pl-9 pr-10 py-3 rounded-2xl text-xs font-bold transition-all focus:outline-none ${
                      isDeliveryFeeValid
                        ? 'bg-emerald-50/20 border border-emerald-300 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                        : 'bg-rose-50/30 border border-rose-300 text-rose-950 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
                    }`}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isDeliveryFeeValid ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  Standard door-to-door courier fee charged when orders don't qualify for free delivery.
                </p>
              </div>

              {/* Express Priority Delivery Fee */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                    <span>Express Priority Delivery Fee ({currency})</span>
                    <span className="text-[10px] font-extrabold text-rose-500">*</span>
                  </label>
                  {isExpressFeeValid ? (
                    <span className="text-[11px] font-bold text-emerald-600">Charge: {currency}{expressDeliveryFee}</span>
                  ) : (
                    <span className="text-[11px] font-bold text-rose-600">Invalid amount</span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                    {currency}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={expressDeliveryFee}
                    onChange={(e) => {
                      setExpressDeliveryFee(e.target.value);
                      setIsGeneralTouched(true);
                    }}
                    placeholder="120"
                    className={`w-full pl-9 pr-10 py-3 rounded-2xl text-xs font-bold transition-all focus:outline-none ${
                      isExpressFeeValid
                        ? 'bg-emerald-50/20 border border-emerald-300 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                        : 'bg-rose-50/30 border border-rose-300 text-rose-950 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
                    }`}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isExpressFeeValid ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  Priority express option for expedited parcel handling and rush dispatch.
                </p>
              </div>
            </div>

            {/* Free Delivery Threshold Box */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 border border-emerald-200/90 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Automatic Free Shipping Threshold</span>
                  </label>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Automatically waive standard delivery fee when customer cart subtotal meets this threshold.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-900">
                    {enableFreeDeliveryThreshold ? 'Enabled' : 'Disabled'}
                  </span>
                  <input
                    type="checkbox"
                    checked={enableFreeDeliveryThreshold}
                    onChange={(e) => {
                      setEnableFreeDeliveryThreshold(e.target.checked);
                      setIsGeneralTouched(true);
                    }}
                    className="w-5 h-5 text-[#ff6452] rounded-lg border-emerald-300 focus:ring-[#ff6452] cursor-pointer"
                  />
                </div>
              </div>

              {enableFreeDeliveryThreshold && (
                <div className="pt-2">
                  <div className="relative max-w-sm">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-900">
                      {currency}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={freeDeliveryThreshold}
                      onChange={(e) => {
                        setFreeDeliveryThreshold(e.target.value);
                        setIsGeneralTouched(true);
                      }}
                      placeholder="800"
                      className={`w-full pl-9 pr-10 py-3 rounded-2xl text-xs font-black text-emerald-950 transition-all focus:outline-none ${
                        isThresholdValid
                          ? 'bg-white border border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                          : 'bg-rose-50 border border-rose-300 text-rose-950 focus:border-rose-500'
                      }`}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {isThresholdValid ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1.5">
                    Orders with subtotal ≥ {currency}{freeDeliveryThreshold || '0'} automatically qualify for FREE standard delivery.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CARD 3: TRANSIT TIMELINES & CUSTOMER DISPATCH NOTES */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 font-bold border border-purple-100">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 tracking-tight">
                    Transit Timelines & Customer Dispatch Notes
                  </h3>
                  <p className="text-xs text-gray-500">
                    Estimated arrival schedules and carrier instructions displayed in cart and checkout.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                Timelines & Policies
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Standard Estimated Transit */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800">Standard Estimated Transit</label>
                  {isStandardDaysValid ? (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Configured
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-rose-600">Required</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={estimatedStandardDays}
                    onChange={(e) => {
                      setEstimatedStandardDays(e.target.value);
                      setIsGeneralTouched(true);
                    }}
                    placeholder="e.g. 2 - 4 Business Days"
                    className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 transition-all focus:bg-white focus:outline-none focus:border-[#ff6452] focus:ring-2 focus:ring-[#ff6452]/10"
                  />
                </div>
                <p className="text-[11px] text-gray-500">Typical duration for regional economy dispatch.</p>
              </div>

              {/* Express Estimated Transit */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800">Express Estimated Transit</label>
                  {isExpressDaysValid ? (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Configured
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-rose-600">Required</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={estimatedExpressDays}
                    onChange={(e) => {
                      setEstimatedExpressDays(e.target.value);
                      setIsGeneralTouched(true);
                    }}
                    placeholder="e.g. 1 - 2 Business Days"
                    className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 transition-all focus:bg-white focus:outline-none focus:border-[#ff6452] focus:ring-2 focus:ring-[#ff6452]/10"
                  />
                </div>
                <p className="text-[11px] text-gray-500">Overnight / priority courier turnaround.</p>
              </div>
            </div>

            {/* Courier & Shipping Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">Courier & Shipping Notes</label>
              <input
                type="text"
                value={shippingNotes}
                onChange={(e) => {
                  setShippingNotes(e.target.value);
                  setIsGeneralTouched(true);
                }}
                placeholder="e.g. Nationwide door-to-door courier via The Courier Guy & Aramex."
                className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl text-xs font-medium text-gray-800 transition-all focus:bg-white focus:outline-none focus:border-[#ff6452] focus:ring-2 focus:ring-[#ff6452]/10"
              />
              <p className="text-[11px] text-gray-500">Carrier information and tracking notes displayed to buyers.</p>
            </div>

            {/* Live Interactive Delivery Preview Box */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                  <Sparkles className="w-3.5 h-3.5 text-[#ff6452]" />
                  <span>Customer Checkout Delivery Selector (Live Preview):</span>
                </div>
                <span className="text-[10px] font-mono text-gray-500 font-bold bg-white px-2 py-0.5 rounded-md border border-gray-200">
                  WYSIWYG Preview
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-xs relative">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-gray-900">Standard Delivery</span>
                    <span className="font-black text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                      {deliveryFee === '0' ? 'FREE' : `${currency}${deliveryFee}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">{estimatedStandardDays}</p>
                  {enableFreeDeliveryThreshold && (
                    <span className="inline-block mt-2 text-[10px] font-bold text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-100">
                      FREE on orders over {currency}{freeDeliveryThreshold}
                    </span>
                  )}
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-blue-200 shadow-xs relative">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-gray-900">Express Priority</span>
                    <span className="font-black text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                      {currency}{expressDeliveryFee}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">{estimatedExpressDays}</p>
                  <span className="inline-block mt-2 text-[10px] font-bold text-blue-800 bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-100">
                    Rush Dispatch & Real-Time Tracking
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 4: CUSTOMER SUPPORT & CONTACT CHANNELS */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#ff6452] flex items-center justify-center flex-shrink-0 font-bold border border-rose-100">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 tracking-tight">
                    Customer Care & Support Channels
                  </h3>
                  <p className="text-xs text-gray-500">
                    Official email addresses and phone lines displayed on customer invoices, tickets, and order tracking.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                Support Channels
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Support Email Input with Validation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-500" />
                    <span>Support Email</span>
                    <span className="text-[10px] font-extrabold text-rose-500">*</span>
                  </label>
                  {isEmailValid ? (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Valid Email
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Invalid Email Format
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => {
                      setContactEmail(e.target.value);
                      setIsGeneralTouched(true);
                    }}
                    placeholder="support@yourdomain.co.za"
                    className={`w-full pl-4 pr-10 py-3 rounded-2xl text-xs font-semibold transition-all focus:outline-none ${
                      isEmailValid
                        ? 'bg-emerald-50/20 border border-emerald-300 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                        : 'bg-rose-50/30 border border-rose-300 text-rose-950 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
                    }`}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isEmailValid ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  Target address for customer order questions, refund tickets, and courier alerts.
                </p>
              </div>

              {/* Support Phone Line Input with Validation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-500" />
                    <span>Support Phone Line</span>
                    <span className="text-[10px] font-extrabold text-rose-500">*</span>
                  </label>
                  {isPhoneValid ? (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Valid Phone
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Min 8 digits
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => {
                      setContactPhone(e.target.value);
                      setIsGeneralTouched(true);
                    }}
                    placeholder="+27 (0)11 892 4000"
                    className={`w-full pl-4 pr-10 py-3 rounded-2xl text-xs font-semibold transition-all focus:outline-none ${
                      isPhoneValid
                        ? 'bg-emerald-50/20 border border-emerald-300 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                        : 'bg-rose-50/30 border border-rose-300 text-rose-950 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
                    }`}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isPhoneValid ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  Customer service helpline for immediate telephone assistance.
                </p>
              </div>

              {/* WhatsApp Support Number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Support Number</span>
                    <span className="text-[10px] font-extrabold text-emerald-600">*</span>
                  </label>
                  <span className="text-[11px] font-bold text-emerald-600">Active on Customer Dashboard</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={whatsappSupport}
                    onChange={(e) => {
                      setWhatsappSupport(e.target.value);
                      setIsGeneralTouched(true);
                    }}
                    placeholder="+27797648590"
                    className="w-full pl-4 pr-10 py-3 rounded-2xl text-xs font-semibold font-mono bg-emerald-50/20 border border-emerald-300 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all focus:outline-none"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  Direct WhatsApp link for customer profile & order help (e.g. +27797648590).
                </p>
              </div>

              {/* Help Card Heading */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>Support Section Heading</span>
                </label>
                <input
                  type="text"
                  value={supportHeading}
                  onChange={(e) => {
                    setSupportHeading(e.target.value);
                    setIsGeneralTouched(true);
                  }}
                  placeholder="Need help with an order?"
                  className="w-full px-4 py-3 rounded-2xl text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-900 focus:border-[#ff6452] focus:ring-2 focus:ring-[#ff6452]/10 transition-all focus:outline-none"
                />
                <p className="text-[11px] text-gray-500">
                  Customized title displayed on customer profile, orders, and receipt cards.
                </p>
              </div>

              {/* Help Card Subtext / Note */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                  <span>Support Instructions / Subtext</span>
                </label>
                <input
                  type="text"
                  value={supportSubtext}
                  onChange={(e) => {
                    setSupportSubtext(e.target.value);
                    setIsGeneralTouched(true);
                  }}
                  placeholder="Contact KUD Store support team via email or WhatsApp for instant order updates."
                  className="w-full px-4 py-3 rounded-2xl text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-900 focus:border-[#ff6452] focus:ring-2 focus:ring-[#ff6452]/10 transition-all focus:outline-none"
                />
                <p className="text-[11px] text-gray-500">
                  Detailed guidance text shown below the support title on the customer dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* CARD 4B: CUSTOMER AUTHENTICATION & GOOGLE SIGN-IN OPTIONS */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-gray-200/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                  <GoogleIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <span>Customer Authentication & Google Sign-In</span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    Control authentication methods displayed to shoppers on the customer dashboard, login, and registration pages.
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="self-start sm:self-auto flex items-center gap-2">
                {isTogglingGoogleAuth ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                    <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                    Updating Database...
                  </span>
                ) : enableGoogleAuth ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Google OAuth Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Google OAuth Hidden
                  </span>
                )}
              </div>
            </div>

            {/* In-Card Dynamic Feedback Banner */}
            {googleAuthFeedback && (
              <div
                className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
                  googleAuthFeedback.type === 'success'
                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50/90 border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {googleAuthFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{googleAuthFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setGoogleAuthFeedback(null)}
                  className="text-xs opacity-70 hover:opacity-100 font-bold px-2 py-0.5 rounded cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Modern Toggle Switch Component */}
            <div className="bg-gray-50/80 border border-gray-200/80 rounded-2xl p-4 sm:p-5 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">
                      Enable "Continue with Google" Social Auth Button
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-blue-100 text-blue-800">
                      OAuth 2.0
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-xl">
                    When switched on, customers can instantly sign up or log in using their verified Google account with 1-click authentication. When switched off, the Google button is hidden, presenting customers with direct email & password authentication.
                  </p>
                </div>

                {/* Interactive Modern Switch */}
                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <span className="text-xs font-bold text-gray-600">
                    {enableGoogleAuth ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enableGoogleAuth}
                    disabled={isTogglingGoogleAuth || isLoadingSettings}
                    onClick={() => handleInstantGoogleAuthToggle(!enableGoogleAuth)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#ff6452] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      enableGoogleAuth ? 'bg-[#ff6452]' : 'bg-gray-300'
                    }`}
                  >
                    <span className="sr-only">Toggle Google OAuth</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                        enableGoogleAuth ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    >
                      {isTogglingGoogleAuth ? (
                        <RefreshCw className="w-3 h-3 text-gray-500 animate-spin" />
                      ) : enableGoogleAuth ? (
                        <Check className="w-3.5 h-3.5 text-[#ff6452] stroke-[3]" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Customer Portal Preview */}
            <div className="border border-gray-200/70 rounded-2xl p-4 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#ff6452]" /> Live Customer Portal View Preview
                </span>
                <span className="text-[11px] text-gray-500 font-medium">
                  {enableGoogleAuth ? 'Visible to all shoppers' : 'Hidden from all shoppers'}
                </span>
              </div>

              <div className="bg-gray-50/80 rounded-xl p-4 border border-dashed border-gray-200 max-w-sm mx-auto space-y-3 text-center">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-gray-900">Customer Account Portal</p>
                  <p className="text-[10px] text-gray-500">Sign in to your KUD Store account</p>
                </div>

                {enableGoogleAuth ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="w-full py-2 px-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center justify-center gap-2 shadow-2xs">
                      <GoogleIcon className="w-3.5 h-3.5" />
                      <span>Continue with Google</span>
                    </div>
                    <div className="relative flex items-center justify-center">
                      <div className="w-full border-t border-gray-200" />
                      <span className="bg-gray-50 px-2 text-[9px] font-bold text-gray-400 uppercase">
                        or continue with email
                      </span>
                    </div>
                    <div className="h-8 bg-white border border-gray-200 rounded-xl flex items-center px-3 text-[11px] text-gray-400">
                      customer@example.co.za
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-2 text-[10px] font-medium text-amber-800 text-left flex items-start gap-1.5">
                      <EyeOff className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>Google OAuth button is hidden. Customers will only see standard email & password fields.</span>
                    </div>
                    <div className="h-8 bg-white border border-gray-200 rounded-xl flex items-center px-3 text-[11px] text-gray-400">
                      customer@example.co.za
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CARD 5: SECURITY VAULT OVERVIEW */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 flex items-start gap-3.5">
            <Lock className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-gray-600 space-y-0.5">
              <p className="font-bold text-gray-900">Encrypted Cloud Synchronization & Key Vault Protection:</p>
              <p>
                All store configurations are synchronized with Supabase database storage. Sensitive backend server credentials remain secured behind protected environment variables.
              </p>
            </div>
          </div>

          {/* Save Action Sticky Bar */}
          <div className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs">
              {isGeneralFormValid ? (
                <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> All general fields validated and ready to save.
                </span>
              ) : (
                <span className="font-bold text-rose-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Please resolve invalid field inputs above.
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSaving || !isGeneralFormValid}
              className="flex items-center gap-2 px-7 py-3 bg-[#ff6452] hover:bg-[#ff4935] disabled:opacity-50 text-white text-xs font-black rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Store Settings...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1B: TAX INVOICES & RECEIPT AUTOMATION */}
      {/* ========================================================================= */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <StoreTaxSettingsCard />
          <InvoiceSettingsConfigCard />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COUPONS & DISCOUNTS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'coupons' && <CouponsManagementSettings />}

      {/* ========================================================================= */}
      {/* TAB 2B: REFERRALS & LOYALTY PROGRAM SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'referrals' && <ReferralsManagementSettings />}

      {/* ========================================================================= */}
      {/* TAB 3: STORE LOGO & BRANDING */}
      {/* ========================================================================= */}
      {activeTab === 'branding' && <StoreBrandingSettings />}

      {/* ========================================================================= */}
      {/* TAB 4: PROMO BANNER & ADVERTISING MEDIA */}
      {/* ========================================================================= */}
      {activeTab === 'banner' && <PromoBannerSettings />}

      {/* ========================================================================= */}
      {/* TAB 5: PAYMENT GATEWAY PROVIDERS MANUAL INTEGRATION */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && !isAdmin && (
        <div className="bg-white rounded-3xl p-8 border border-rose-100 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-gray-900">Admin Account Security Isolation</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Payment Gateway configurations, active provider toggles, and encrypted API keys (Yoco, PayFast, Ozow) are{' '}
              <span className="font-bold text-gray-800">isolated strictly to Admin accounts</span>.
            </p>
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 max-w-md mx-auto text-left space-y-1">
            <p className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>Security Access Rule:</span>
            </p>
            <p className="text-[11px] text-amber-800 leading-normal">
              Non-admin store user profiles cannot view or modify secret payment gateway API credentials or payment processing modes.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                localStorage.setItem('kud_store_demo_admin', 'true');
                window.location.reload();
              }}
              className="px-6 py-2.5 bg-[#ff6452] hover:bg-[#ff4935] text-white text-xs font-bold rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Switch to Verified Admin Session</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'payments' && isAdmin && <PaymentGatewaysSettings />}
    </div>
  );
};