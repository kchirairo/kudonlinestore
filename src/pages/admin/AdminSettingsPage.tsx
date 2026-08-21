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

  // Payment Gateway Database Config State
  const [activeProvider, setActiveProvider] = useState<'yoco' | 'payfast' | 'ozow' | 'all'>('yoco');
  const [dbSyncStatus, setDbSyncStatus] = useState<string>('Loaded from Vault');

  // Yoco Gateway State
  const [yocoEnabled, setYocoEnabled] = useState<boolean>(true);
  const [yocoMode, setYocoMode] = useState<'test' | 'live'>('test');
  const [yocoPublicKey, setYocoPublicKey] = useState<string>(
    import.meta.env.VITE_YOCO_PUBLIC_KEY || 'pk_test_placeholder'
  );
  const [yocoSecretKey, setYocoSecretKey] = useState<string>('sk_test_placeholder');
  const [yocoIntegrationMethod, setYocoIntegrationMethod] = useState<'sdk' | 'hosted' | 'hybrid'>('hybrid');
  const [yocoEnable3DS, setYocoEnable3DS] = useState<boolean>(true);
  const [showSecretKey, setShowSecretKey] = useState<boolean>(false);
  const [isTestingYoco, setIsTestingYoco] = useState<boolean>(false);
  const [yocoTestResult, setYocoTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // PayFast State
  const [payfastEnabled, setPayfastEnabled] = useState<boolean>(true);
  const [payfastMerchantId, setPayfastMerchantId] = useState<string>('10000100');
  const [payfastMerchantKey, setPayfastMerchantKey] = useState<string>('46f0cd694581a');
  const [payfastPassphrase, setPayfastPassphrase] = useState<string>('kudstore_passphrase');

  // Ozow State
  const [ozowEnabled, setOzowEnabled] = useState<boolean>(true);
  const [ozowSiteCode, setOzowSiteCode] = useState<string>('KUD-SA-01');
  const [ozowPrivateKey, setOzowPrivateKey] = useState<string>('ozow_private_key_sample');

  // Cash on Delivery State
  const [codEnabled, setCodEnabled] = useState<boolean>(true);
  const [codInstructions, setCodInstructions] = useState<string>(
    'Cash on delivery is available for selected Gauteng and Western Cape metro hubs. Drivers accept cash or card tap.'
  );

  // Validation State
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isGeneralTouched, setIsGeneralTouched] = useState<boolean>(false);

  // Load settings from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      setIsLoadingSettings(true);
      try {
        const [genConfig, payConfig] = await Promise.all([
          adminService.getGeneralSettings(),
          adminService.getPaymentSettings(),
        ]);

        if (isMounted) {
          if (genConfig) {
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

          if (payConfig) {
            setActiveProvider(payConfig.activeProvider || 'yoco');

            if (payConfig.yoco) {
              setYocoEnabled(payConfig.yoco.enabled);
              setYocoMode(payConfig.yoco.mode || 'test');
              setYocoPublicKey(payConfig.yoco.publicKey || import.meta.env.VITE_YOCO_PUBLIC_KEY || 'pk_test_placeholder');
              setYocoSecretKey(payConfig.yoco.secretKey || 'sk_test_placeholder');
              setYocoIntegrationMethod(payConfig.yoco.integrationMethod || 'hybrid');
              setYocoEnable3DS(payConfig.yoco.enable3DS ?? true);
            }

            if (payConfig.payfast) {
              setPayfastEnabled(payConfig.payfast.enabled);
              setPayfastMerchantId(payConfig.payfast.merchantId || '10000100');
              setPayfastMerchantKey(payConfig.payfast.merchantKey || '46f0cd694581a');
              setPayfastPassphrase(payConfig.payfast.passphrase || 'kudstore_passphrase');
            }

            if (payConfig.ozow) {
              setOzowEnabled(payConfig.ozow.enabled);
              setOzowSiteCode(payConfig.ozow.siteCode || 'KUD-SA-01');
              setOzowPrivateKey(payConfig.ozow.privateKey || 'ozow_private_key_sample');
            }

            if (payConfig.cod) {
              setCodEnabled(payConfig.cod.enabled);
              setCodInstructions(
                payConfig.cod.instructions ||
                  'Cash on delivery is available for selected Gauteng and Western Cape metro hubs. Drivers accept cash or card tap.'
              );
            }

            if (payConfig.lastUpdated) {
              setDbSyncStatus(`Database Synced (${new Date(payConfig.lastUpdated).toLocaleTimeString()})`);
            }
          }
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

  const getYocoPublicKeyValidation = () => {
    if (!yocoEnabled) return { valid: true, message: 'Optional (Gateway disabled)' };
    const val = yocoPublicKey.trim();
    if (!val) return { valid: false, message: 'Public Key cannot be empty' };
    if (yocoMode === 'live') {
      if (val.includes('placeholder') || val.startsWith('pk_test_')) {
        return { valid: false, message: 'Live mode requires a pk_live_ key (not a test key)' };
      }
      if (val.startsWith('pk_live_') || val.startsWith('pk_')) {
        return { valid: true, message: 'Valid live public key format' };
      }
      return { valid: false, message: 'Must start with pk_live_' };
    } else {
      if (val.startsWith('pk_test_') || val.startsWith('pk_') || val === 'pk_test_placeholder') {
        return { valid: true, message: 'Valid test sandbox public key format' };
      }
      return { valid: false, message: 'Must start with pk_test_' };
    }
  };

  const getYocoSecretKeyValidation = () => {
    if (!yocoEnabled) return { valid: true, message: 'Optional (Gateway disabled)' };
    const val = yocoSecretKey.trim();
    if (!val) return { valid: false, message: 'Secret Key cannot be empty' };
    if (yocoMode === 'live') {
      if (val.includes('placeholder') || val.startsWith('sk_test_')) {
        return { valid: false, message: 'Live mode requires a sk_live_ secret key' };
      }
      if (val.startsWith('sk_live_') || val.startsWith('sk_')) {
        return { valid: true, message: 'Valid live secret key format' };
      }
      return { valid: false, message: 'Must start with sk_live_' };
    } else {
      if (val.startsWith('sk_test_') || val.startsWith('sk_') || val === 'sk_test_placeholder') {
        return { valid: true, message: 'Valid test sandbox secret key format' };
      }
      return { valid: false, message: 'Must start with sk_test_' };
    }
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

  const validateKeys = (): boolean => {
    const errors: Record<string, string> = {};

    if (yocoEnabled) {
      const pubCheck = getYocoPublicKeyValidation();
      if (!pubCheck.valid) errors.yocoPublicKey = pubCheck.message;

      const secCheck = getYocoSecretKeyValidation();
      if (!secCheck.valid) errors.yocoSecretKey = secCheck.message;
    }

    if (payfastEnabled) {
      if (!payfastMerchantId || payfastMerchantId.trim() === '') {
        errors.payfastMerchantId = 'PayFast Merchant ID cannot be empty.';
      } else if (!/^\d{4,12}$/.test(payfastMerchantId.trim())) {
        errors.payfastMerchantId = 'PayFast Merchant ID must be a numeric ID (e.g., 10000100).';
      }

      if (!payfastMerchantKey || payfastMerchantKey.trim() === '') {
        errors.payfastMerchantKey = 'PayFast Merchant Key cannot be empty.';
      } else if (payfastMerchantKey.trim().length < 8) {
        errors.payfastMerchantKey = 'PayFast Merchant Key must be at least 8 alphanumeric characters.';
      }

      if (payfastPassphrase && payfastPassphrase.trim().length < 6) {
        errors.payfastPassphrase = 'PayFast Passphrase must be at least 6 characters if specified.';
      }
    }

    if (ozowEnabled) {
      if (!ozowSiteCode || ozowSiteCode.trim() === '') {
        errors.ozowSiteCode = 'Ozow Site Code cannot be empty.';
      } else if (ozowSiteCode.trim().length < 3) {
        errors.ozowSiteCode = 'Ozow Site Code must be at least 3 characters.';
      }

      if (!ozowPrivateKey || ozowPrivateKey.trim() === '') {
        errors.ozowPrivateKey = 'Ozow Private Key cannot be empty.';
      } else if (ozowPrivateKey.trim().length < 8) {
        errors.ozowPrivateKey = 'Ozow Private Key must be at least 8 characters long.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      showToast('Unauthorized: Payment gateway configuration is isolated to Admin accounts.', 'error');
      return;
    }

    if (!validateKeys()) {
      showToast('Please fix invalid API key formats before saving to database.', 'error');
      return;
    }

    setIsSaving(true);

    const payload: PaymentGatewayConfig = {
      activeProvider,
      yoco: {
        enabled: yocoEnabled,
        mode: yocoMode,
        publicKey: yocoPublicKey,
        secretKey: yocoSecretKey,
        integrationMethod: yocoIntegrationMethod,
        enable3DS: yocoEnable3DS,
      },
      payfast: {
        enabled: payfastEnabled,
        mode: 'test',
        merchantId: payfastMerchantId,
        merchantKey: payfastMerchantKey,
        passphrase: payfastPassphrase,
      },
      ozow: {
        enabled: ozowEnabled,
        siteCode: ozowSiteCode,
        privateKey: ozowPrivateKey,
      },
      cod: {
        enabled: codEnabled,
        instructions: codInstructions,
      },
    };

    try {
      const res = await adminService.savePaymentSettings(payload);
      if (res.success) {
        setDbSyncStatus(`Saved & Encrypted to DB (${new Date().toLocaleTimeString()})`);
        setValidationErrors({});
        showToast('Payment gateway API keys validated, encrypted & saved to database!', 'success');
      } else {
        showToast(res.error || 'Failed to persist settings to database', 'error');
      }
    } catch (err: any) {
      console.error('Error saving payment settings:', err);
      showToast('Error persisting settings to database.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const testYocoConnection = async () => {
    setIsTestingYoco(true);
    setYocoTestResult(null);

    try {
      const res = await fetch('/api/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'test_token_ping',
          amountInCents: 100,
          currency: 'ZAR',
          orderId: 'test_ping',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 200 || res.status === 400) {
        setYocoTestResult({
          success: true,
          message: `Server endpoint /api/process-payment is online & responsive (Status ${res.status}). Yoco SDK script is ready in browser window.`,
        });
        showToast('Yoco Gateway endpoint pinged successfully!', 'success');
      } else {
        setYocoTestResult({
          success: false,
          message: `Server returned unexpected status ${res.status}: ${data.error || 'Check server logs.'}`,
        });
        showToast('Yoco endpoint ping failed.', 'error');
      }
    } catch (err: any) {
      setYocoTestResult({
        success: false,
        message: `Connection error: ${err?.message || 'Could not reach /api/process-payment server route.'}`,
      });
      showToast('Yoco connection test error.', 'error');
    } finally {
      setIsTestingYoco(false);
    }
  };

  const yocoPubStatus = getYocoPublicKeyValidation();
  const yocoSecStatus = getYocoSecretKeyValidation();

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

      {activeTab === 'payments' && isAdmin && (
        <div className="space-y-6">
          {/* Status Summary Banners */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Yoco Web SDK</p>
                <p className="text-xs font-black text-emerald-950">CDN Script Loaded & Active</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Charges API Endpoint</p>
                <p className="text-xs font-black text-blue-950">`/api/process-payment` Ready</p>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Database Key Vault</p>
                <p className="text-xs font-black text-purple-950">{dbSyncStatus}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSavePaymentSettings} className="space-y-6">
            {/* VALIDATION ALERT SUMMARY BOX */}
            {Object.keys(validationErrors).length > 0 && (
              <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-rose-900 font-black text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <span>
                    Invalid API Key Format Detected ({Object.keys(validationErrors).length} Issue
                    {Object.keys(validationErrors).length > 1 ? 's' : ''})
                  </span>
                </div>
                <p className="text-xs text-rose-700">
                  Please fix the following validation issues before saving to the database key vault:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs font-semibold text-rose-800">
                  {Object.entries(validationErrors).map(([key, msg]) => (
                    <li key={key}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* SECURITY, ENCRYPTION & RLS POLICY BADGE */}
            <div className="bg-emerald-950/90 border border-emerald-500/30 rounded-2xl p-4 text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 font-bold">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-extrabold text-white text-xs">Row-Level Security (RLS) & AES Payload Encryption</p>
                  <p className="text-[11px] text-emerald-300/80">
                    API keys are validated, encrypted before DB storage, and protected by PostgreSQL RLS table rules.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto bg-emerald-900/60 border border-emerald-700/50 px-3 py-1 rounded-xl text-[10px] font-mono text-emerald-300 whitespace-nowrap">
                <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                <span>Format Validation & RLS Active</span>
              </div>
            </div>

            {/* PRIMARY PROVIDER SELECTION CARD */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
                <div>
                  <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <Radio className="w-5 h-5 text-[#ff6452] animate-pulse" />
                    <span>Primary Store Payment Provider Selection</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Select which payment gateway handles primary customer checkout card tokenization and authorization.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-[11px] font-mono text-emerald-400">
                  <Database className="w-3.5 h-3.5" />
                  <span>Encrypted DB Key Storage</span>
                </div>
              </div>

              {/* Provider Radio Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* YOCO CARD */}
                <button
                  type="button"
                  onClick={() => setActiveProvider('yoco')}
                  className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                    activeProvider === 'yoco'
                      ? 'bg-blue-950/90 border-[#ff6452] ring-2 ring-[#ff6452]/50 shadow-md'
                      : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-base text-blue-400">Yoco</span>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        activeProvider === 'yoco'
                          ? 'bg-[#ff6452] text-white font-black'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {activeProvider === 'yoco' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : ''}
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-200">SDK + Charges API</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Card Tokenization & Instant Authorization</p>
                  <div className="mt-3 inline-block bg-blue-900/60 text-blue-300 text-[10px] font-mono px-2 py-0.5 rounded-md">
                    Recommended Primary
                  </div>
                </button>

                {/* PAYFAST CARD */}
                <button
                  type="button"
                  onClick={() => setActiveProvider('payfast')}
                  className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                    activeProvider === 'payfast'
                      ? 'bg-rose-950/90 border-[#ff6452] ring-2 ring-[#ff6452]/50 shadow-md'
                      : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-base text-rose-400">PayFast</span>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        activeProvider === 'payfast'
                          ? 'bg-[#ff6452] text-white font-black'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {activeProvider === 'payfast' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : ''}
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-200">PayFast Engine</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Hosted Redirect Gateway & Debit</p>
                  <div className="mt-3 inline-block bg-rose-900/60 text-rose-300 text-[10px] font-mono px-2 py-0.5 rounded-md">
                    Merchant Keys DB
                  </div>
                </button>

                {/* OZOW CARD */}
                <button
                  type="button"
                  onClick={() => setActiveProvider('ozow')}
                  className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                    activeProvider === 'ozow'
                      ? 'bg-purple-950/90 border-[#ff6452] ring-2 ring-[#ff6452]/50 shadow-md'
                      : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-base text-purple-400">Ozow</span>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        activeProvider === 'ozow'
                          ? 'bg-[#ff6452] text-white font-black'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {activeProvider === 'ozow' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : ''}
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-200">Capitec & Bank EFT</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Instant Bank Transfer Verification</p>
                  <div className="mt-3 inline-block bg-purple-900/60 text-purple-300 text-[10px] font-mono px-2 py-0.5 rounded-md">
                    EFT Active
                  </div>
                </button>

                {/* MULTI-GATEWAY ALL CARD */}
                <button
                  type="button"
                  onClick={() => setActiveProvider('all')}
                  className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                    activeProvider === 'all'
                      ? 'bg-emerald-950/90 border-[#ff6452] ring-2 ring-[#ff6452]/50 shadow-md'
                      : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-base text-emerald-400">Multi-Gateway</span>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        activeProvider === 'all'
                          ? 'bg-[#ff6452] text-white font-black'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {activeProvider === 'all' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : ''}
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-200">All Providers Active</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Yoco + PayFast + Ozow at Checkout</p>
                  <div className="mt-3 inline-block bg-emerald-900/60 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-md">
                    Full Checkout Choice
                  </div>
                </button>
              </div>
            </div>

            {/* FEATURED CARD: YOCO PAYMENTS INTEGRATION */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#ff6452]/30 shadow-xs space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#ff6452] text-white text-[10px] font-black uppercase tracking-wider px-4 py-1 rounded-bl-2xl">
                Primary Payment Partner
              </div>

              {/* Yoco Branding Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-900 text-white font-black text-xl flex items-center justify-center shadow-xs">
                    yoco
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <span>Yoco Online Payments & Charges API</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                        Active Integration
                      </span>
                    </h2>
                    <p className="text-xs text-gray-500">
                      Tokenize cards via Yoco Web SDK on the frontend and charge securely via backend Charges API (`/api/process-payment`).
                    </p>
                  </div>
                </div>

                {/* Enable / Disable Toggle */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-600">
                    {yocoEnabled ? 'Gateway Enabled' : 'Gateway Disabled'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setYocoEnabled(!yocoEnabled)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                      yocoEnabled ? 'bg-[#ff6452]' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        yocoEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Environment Mode Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <label className="text-xs font-bold text-gray-800 block mb-1">Environment Mode</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="yocoMode"
                        value="test"
                        checked={yocoMode === 'test'}
                        onChange={() => setYocoMode('test')}
                        className="text-[#ff6452] focus:ring-[#ff6452]"
                      />
                      <span>Test / Sandbox Mode</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="yocoMode"
                        value="live"
                        checked={yocoMode === 'live'}
                        onChange={() => setYocoMode('live')}
                        className="text-[#ff6452] focus:ring-[#ff6452]"
                      />
                      <span className="text-rose-600 font-extrabold">Live Production Mode</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-800 block mb-1">Integration Flow</label>
                  <select
                    value={yocoIntegrationMethod}
                    onChange={(e: any) => setYocoIntegrationMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#ff6452]"
                  >
                    <option value="hybrid">SDK Client Tokenization + Charges API (Recommended)</option>
                    <option value="hosted">Yoco Hosted Checkout Redirect</option>
                    <option value="sdk">Strict Client SDK Only</option>
                  </select>
                </div>
              </div>

              {/* Yoco Key Credentials with Live Validation Visual Cues */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#ff6452]" />
                  <span>API Key Credentials & Format Verification</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Public Key */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                        <span>Yoco Public Key (SDK Client)</span>
                        <span className="text-[10px] font-extrabold text-rose-500">*</span>
                      </label>
                      {yocoPubStatus.valid ? (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Valid Key
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Invalid Format
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={yocoPublicKey}
                        onChange={(e) => {
                          setYocoPublicKey(e.target.value);
                          if (validationErrors.yocoPublicKey) {
                            setValidationErrors((prev) => ({ ...prev, yocoPublicKey: '' }));
                          }
                        }}
                        placeholder="pk_test_..."
                        className={`w-full pl-4 pr-10 py-3 rounded-2xl text-xs font-mono font-bold transition-all focus:outline-none ${
                          yocoPubStatus.valid
                            ? 'bg-emerald-50/20 border border-emerald-300 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                            : 'border-rose-400 bg-rose-50/30 text-rose-950 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
                        }`}
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        {yocoPubStatus.valid ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                        )}
                      </div>
                    </div>
                    <p
                      className={`text-[11px] ${
                        yocoPubStatus.valid ? 'text-gray-500' : 'text-rose-600 font-semibold'
                      }`}
                    >
                      {yocoPubStatus.message}
                    </p>
                  </div>

                  {/* Secret Key */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                        <span>Yoco Secret Key (Charges API Backend)</span>
                        <span className="text-[10px] font-extrabold text-rose-500">*</span>
                      </label>
                      {yocoSecStatus.valid ? (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Valid Key
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Invalid Format
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showSecretKey ? 'text' : 'password'}
                        value={yocoSecretKey}
                        onChange={(e) => {
                          setYocoSecretKey(e.target.value);
                          if (validationErrors.yocoSecretKey) {
                            setValidationErrors((prev) => ({ ...prev, yocoSecretKey: '' }));
                          }
                        }}
                        placeholder="sk_test_..."
                        className={`w-full pl-4 pr-16 py-3 rounded-2xl text-xs font-mono font-bold transition-all focus:outline-none ${
                          yocoSecStatus.valid
                            ? 'bg-emerald-50/20 border border-emerald-300 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                            : 'border-rose-400 bg-rose-50/30 text-rose-950 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        {yocoSecStatus.valid ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                        )}
                      </div>
                    </div>
                    <p
                      className={`text-[11px] ${
                        yocoSecStatus.valid ? 'text-gray-500' : 'text-rose-600 font-semibold'
                      }`}
                    >
                      {yocoSecStatus.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Features & Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={yocoEnable3DS}
                    onChange={(e) => setYocoEnable3DS(e.target.checked)}
                    className="w-4 h-4 text-[#ff6452] rounded-md focus:ring-[#ff6452]"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">3D Secure (3DS) Authentication</span>
                    <span className="text-[11px] text-gray-500">
                      Automatically handle bank redirects for OTP authentication
                    </span>
                  </div>
                </label>

                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Currency Support</span>
                    <span className="text-[11px] text-gray-500">South African Rand (ZAR / Cents)</span>
                  </div>
                  <span className="font-mono font-black text-xs text-gray-700 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                    ZAR (R)
                  </span>
                </div>
              </div>

              {/* Endpoint Connection Test */}
              <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#ff6452]" />
                      <span>Live Backend Endpoint Verification</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Verify `/api/process-payment` server route responsiveness and backend charge handler.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={testYocoConnection}
                    disabled={isTestingYoco}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#ff6452] hover:bg-[#ff4935] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingYoco ? 'animate-spin' : ''}`} />
                    <span>{isTestingYoco ? 'Testing...' : 'Test Yoco Endpoint'}</span>
                  </button>
                </div>

                {yocoTestResult && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2.5 ${
                      yocoTestResult.success
                        ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {yocoTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    )}
                    <span>{yocoTestResult.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ADDITIONAL PAYMENT GATEWAYS SECTION */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                Additional Supported Payment Gateways
              </h3>

              {/* CARD: PayFast */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center">
                      PF
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900">PayFast Gateway (Cards & Instant EFT)</h4>
                      <p className="text-[11px] text-gray-500">South African payment aggregator</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPayfastEnabled(!payfastEnabled)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                      payfastEnabled ? 'bg-[#ff6452]' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        payfastEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {payfastEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-gray-700">Merchant ID</label>
                        {/^\d{4,12}$/.test(payfastMerchantId.trim()) ? (
                          <span className="text-[10px] font-bold text-emerald-600">✓ Valid Numeric ID</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-600">4-12 digits required</span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={payfastMerchantId}
                        onChange={(e) => {
                          setPayfastMerchantId(e.target.value);
                          if (validationErrors.payfastMerchantId) {
                            setValidationErrors((prev) => ({ ...prev, payfastMerchantId: '' }));
                          }
                        }}
                        placeholder="10000100"
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold transition-all focus:outline-none ${
                          /^\d{4,12}$/.test(payfastMerchantId.trim())
                            ? 'bg-emerald-50/20 border border-emerald-300 text-gray-900 focus:border-emerald-500'
                            : 'border-rose-400 bg-rose-50/30 text-rose-950 focus:border-rose-500'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-gray-700">Merchant Key</label>
                        {payfastMerchantKey.trim().length >= 8 ? (
                          <span className="text-[10px] font-bold text-emerald-600">✓ Valid Key</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-600">Min 8 chars</span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={payfastMerchantKey}
                        onChange={(e) => {
                          setPayfastMerchantKey(e.target.value);
                          if (validationErrors.payfastMerchantKey) {
                            setValidationErrors((prev) => ({ ...prev, payfastMerchantKey: '' }));
                          }
                        }}
                        placeholder="46f0cd694581a"
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold transition-all focus:outline-none ${
                          payfastMerchantKey.trim().length >= 8
                            ? 'bg-emerald-50/20 border border-emerald-300 text-gray-900 focus:border-emerald-500'
                            : 'border-rose-400 bg-rose-50/30 text-rose-950 focus:border-rose-500'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-gray-700">Passphrase</label>
                        <span className="text-[10px] text-gray-500">Optional</span>
                      </div>
                      <input
                        type="password"
                        value={payfastPassphrase}
                        onChange={(e) => {
                          setPayfastPassphrase(e.target.value);
                          if (validationErrors.payfastPassphrase) {
                            setValidationErrors((prev) => ({ ...prev, payfastPassphrase: '' }));
                          }
                        }}
                        placeholder="Passphrase"
                        className="w-full px-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:border-[#ff6452]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* CARD: Ozow Instant EFT */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-700 text-white font-black text-xs flex items-center justify-center">
                      OZ
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900">Ozow Instant EFT (Capitec Pay)</h4>
                      <p className="text-[11px] text-gray-500">Zero-fee instant bank transfers from SA banks</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOzowEnabled(!ozowEnabled)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                      ozowEnabled ? 'bg-[#ff6452]' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        ozowEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {ozowEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-gray-700">Site Code</label>
                        {ozowSiteCode.trim().length >= 3 ? (
                          <span className="text-[10px] font-bold text-emerald-600">✓ Valid Code</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-600">Min 3 chars</span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={ozowSiteCode}
                        onChange={(e) => {
                          setOzowSiteCode(e.target.value);
                          if (validationErrors.ozowSiteCode) {
                            setValidationErrors((prev) => ({ ...prev, ozowSiteCode: '' }));
                          }
                        }}
                        placeholder="KUD-SA-01"
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold transition-all focus:outline-none ${
                          ozowSiteCode.trim().length >= 3
                            ? 'bg-emerald-50/20 border border-emerald-300 text-gray-900 focus:border-emerald-500'
                            : 'border-rose-400 bg-rose-50/30 text-rose-950 focus:border-rose-500'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-gray-700">Private Key</label>
                        {ozowPrivateKey.trim().length >= 8 ? (
                          <span className="text-[10px] font-bold text-emerald-600">✓ Valid Key</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-600">Min 8 chars</span>
                        )}
                      </div>
                      <input
                        type="password"
                        value={ozowPrivateKey}
                        onChange={(e) => {
                          setOzowPrivateKey(e.target.value);
                          if (validationErrors.ozowPrivateKey) {
                            setValidationErrors((prev) => ({ ...prev, ozowPrivateKey: '' }));
                          }
                        }}
                        placeholder="Private Key"
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-mono font-bold transition-all focus:outline-none ${
                          ozowPrivateKey.trim().length >= 8
                            ? 'bg-emerald-50/20 border border-emerald-300 text-gray-900 focus:border-emerald-500'
                            : 'border-rose-400 bg-rose-50/30 text-rose-950 focus:border-rose-500'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* CARD: Cash on Delivery */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-800 text-white font-black text-xs flex items-center justify-center">
                      COD
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900">Cash / Card on Delivery</h4>
                      <p className="text-[11px] text-gray-500">Customer pays upon courier arrival</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCodEnabled(!codEnabled)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                      codEnabled ? 'bg-[#ff6452]' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        codEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {codEnabled && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-bold text-gray-700">Customer Instructions</label>
                    <textarea
                      rows={2}
                      value={codInstructions}
                      onChange={(e) => setCodInstructions(e.target.value)}
                      className="w-full p-3 bg-gray-50/80 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#ff6452]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Submit Bar */}
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-7 py-3.5 bg-[#ff6452] hover:bg-[#ff4935] text-white text-xs font-black rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Configurations...' : 'Save Payment Gateway Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
