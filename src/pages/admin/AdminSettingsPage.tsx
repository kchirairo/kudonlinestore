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

type SettingsTab = 'general' | 'coupons' | 'branding' | 'banner' | 'payments';

export const AdminSettingsPage: React.FC = () => {
  const { showToast, reloadGeneralSettings, updateGeneralSettings } = useShop();
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') as SettingsTab | null;

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    if (
      activeTabParam === 'payments' ||
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
    if (tab && ['general', 'coupons', 'branding', 'banner', 'payments'].includes(tab)) {
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
  const [storeDescription, setStoreDescription] = useState<string>(
    'Premium South African marketplace delivering beauty, technology, home goods, and lifestyle products.'
  );

  // Validation State
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isGeneralTouched, setIsGeneralTouched] = useState<boolean>(false);

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
          setStoreDescription(genConfig.storeDescription || '');
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
        storeDescription: storeDescription.trim(),
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
          setStoreDescription(reloaded.storeDescription);
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COUPONS & DISCOUNTS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'coupons' && <CouponsManagementSettings />}

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