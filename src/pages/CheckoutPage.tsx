import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Lock, CreditCard, Landmark, Truck, AlertCircle, RefreshCw, AlertTriangle, Ban, PauseCircle, ImageOff } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { STORE_CONFIG, PAYMENT_METHODS } from '../constants/config';
import { orderService } from '../services/orderService';
import { adminService } from '../services/adminService';
import { ShippingAddress, PaymentGatewayConfig, Order } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SEOHead } from '../components/SEOHead';
import { AccountStatusCheckoutGuard } from '../components/AccountStatusCheckoutGuard';
import { marketingService } from '../services/marketingService';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    cart,
    cartSubtotal,
    deliveryFee,
    clearCart,
    user,
    isAuthLoading,
    isAccountDisabled,
    accountStatus,
    disabledReason,
    showToast,
  } = useShop();

  const [paymentConfig, setPaymentConfig] = useState<PaymentGatewayConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);

  // Persistent VAT / TAX settings loaded via RPC get_store_tax_settings
  const [taxSettings, setTaxSettings] = useState<{
    tax_enabled: boolean;
    tax_name: string;
    tax_rate: number;
    show_tax_on_receipt: boolean;
    vat_registration_number?: string | null;
  }>({
    tax_enabled: false,
    tax_name: 'VAT',
    tax_rate: 15,
    show_tax_on_receipt: true,
    vat_registration_number: null,
  });
  const [isLoadingTax, setIsLoadingTax] = useState<boolean>(true);

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    addressLine: '',
    city: '',
    province: STORE_CONFIG.SOUTH_AFRICAN_PROVINCES[0],
    postalCode: '',
  });

  // Sync shipping address when user is restored
  useEffect(() => {
    if (user) {
      setShippingAddress((prev) => {
        const nextFullName = prev.fullName || user.fullName || '';
        const nextEmail = prev.email || user.email || '';
        const nextPhone = prev.phone || user.phone || '';

        if (
          prev.fullName === nextFullName &&
          prev.email === nextEmail &&
          prev.phone === nextPhone
        ) {
          return prev;
        }

        return {
          ...prev,
          fullName: nextFullName,
          email: nextEmail,
          phone: nextPhone,
        };
      });
    }
  }, [user?.id, user?.fullName, user?.email, user?.phone]);

  const [paymentMethod, setPaymentMethod] = useState<string>('yoco');
  const [selectedBank, setSelectedBank] = useState<string>('Capitec Bank');
  const [cardDetails, setCardDetails] = useState({
    cardHolder: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

  // 1. Guard against guest checkouts: require login (only after auth check resolves)
  useEffect(() => {
    if (!isAuthLoading && !user) {
      showToast('Please sign in to proceed with checkout', 'info');
      navigate('/account', { state: { returnUrl: '/checkout' }, replace: true });
    }
  }, [user, isAuthLoading, navigate, showToast]);

  // 2. Fetch active payment gateway configuration
  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        const config = await adminService.getPaymentSettings();
        if (isMounted) {
          setPaymentConfig(config);
          
          // Determine initial payment method from active providers
          const available: string[] = [];
          if (config.yoco?.enabled ?? true) available.push('yoco');
          if (config.card?.enabled) available.push('card');
          if (config.cod?.enabled) available.push('cod');
          if (config.payfast?.enabled) available.push('payfast');
          if (config.ozow?.enabled) available.push('ozow');
          if (config.paypal?.enabled) available.push('paypal');
          if (config.peach_payments?.enabled) available.push('peach_payments');

          if (available.length > 0 && !available.includes(paymentMethod)) {
            setPaymentMethod(available[0]);
          }
        }
      } catch (err) {
        console.warn('Error loading payment configuration:', err);
      } finally {
        if (isMounted) setIsLoadingConfig(false);
      }
    };

    loadConfig();

    // Check if user returned from a cancelled/failed payment
    const status = searchParams.get('status');
    if (status === 'cancelled') {
      setCancelNotice('Your payment was cancelled. Your items remain safely in your cart.');
    } else if (status === 'failed') {
      setCancelNotice('Your payment attempt was unsuccessful. You may try again with another method.');
    }

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  // Fetch persistent VAT / TAX settings using customer RPC endpoint
  useEffect(() => {
    let isMounted = true;
    async function loadTax() {
      setIsLoadingTax(true);
      try {
        if (isSupabaseConfigured() && supabase) {
          const { data, error } = await supabase.rpc('get_store_tax_settings');
          if (!error && data) {
            const row = Array.isArray(data) ? data[0] : data;
            if (row && isMounted) {
              setTaxSettings({
                tax_enabled: Boolean(row.tax_enabled),
                tax_name: row.tax_name || 'VAT',
                tax_rate: row.tax_rate !== undefined && row.tax_rate !== null ? Number(row.tax_rate) : 15,
                show_tax_on_receipt: row.show_tax_on_receipt !== false,
                vat_registration_number: row.vat_registration_number || null,
              });
              setIsLoadingTax(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('[Checkout] Notice querying store tax settings:', err);
      }
      if (isMounted) {
        setIsLoadingTax(false);
      }
    }
    loadTax();
    return () => {
      isMounted = false;
    };
  }, []);

  // Track Initiate Checkout for Marketing Analytics & Meta/TikTok Pixel
  const hasTrackedCheckout = React.useRef(false);
  useEffect(() => {
    if (cart && cart.length > 0 && !hasTrackedCheckout.current) {
      hasTrackedCheckout.current = true;
      const initialTax = taxSettings.tax_enabled ? cartSubtotal * (taxSettings.tax_rate / 100) : 0;
      const total = cartSubtotal + deliveryFee + initialTax;
      marketingService.trackInitiateCheckout(cart, total, user);
    }
  }, [cart, cartSubtotal, deliveryFee, user, taxSettings]);

  // Calculate active payment methods visible to customer strictly based on Admin configuration
  const availablePaymentMethods = PAYMENT_METHODS.filter((method) => {
    if (!paymentConfig) {
      return method.id === 'yoco';
    }
    if (method.id === 'yoco') return paymentConfig.yoco?.enabled ?? true;
    if (method.id === 'card') return paymentConfig.card?.enabled ?? false;
    if (method.id === 'cod') return paymentConfig.cod?.enabled ?? false;
    if (method.id === 'payfast') return paymentConfig.payfast?.enabled ?? false;
    if (method.id === 'ozow') return paymentConfig.ozow?.enabled ?? false;
    if (method.id === 'paypal') return paymentConfig.paypal?.enabled ?? false;
    if (method.id === 'peach_payments') return paymentConfig.peach_payments?.enabled ?? false;
    return false;
  });

  const discountAmount = 0; // standard checkout
  const taxableAmount = Math.max(0, cartSubtotal - discountAmount);
  const taxAmount = taxSettings.tax_enabled
    ? Math.round(taxableAmount * (taxSettings.tax_rate / 100) * 100) / 100
    : 0;
  const totalAmount = Math.round((cartSubtotal + deliveryFee + taxAmount - discountAmount) * 100) / 100;

  if (isAuthLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#ff6452] mx-auto flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-gray-500">Restoring checkout session...</p>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <>
        <SEOHead
          title={`Checkout | ${STORE_CONFIG.STORE_NAME}`}
          description="Secure checkout with Yoco payment integration."
          canonicalPath="/checkout"
          noindex={true}
        />
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <h2 className="text-xl font-bold text-gray-900">Your cart is empty</h2>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2.5 bg-[#ff6452] text-white font-bold rounded-full text-sm"
          >
            Return to Shop
          </button>
        </div>
      </>
    );
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setShippingAddress((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCardDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    if (isAccountDisabled) {
      const msg =
        accountStatus === 'on_hold'
          ? 'Your account is currently on hold. Orders and transactions are suspended.'
          : 'Your account has been disabled. You cannot place orders or complete transactions.';
      setPaymentError(msg);
      showToast(msg, 'error');
      return;
    }

    if (
      !shippingAddress.fullName ||
      !shippingAddress.email ||
      !shippingAddress.phone ||
      !shippingAddress.addressLine ||
      !shippingAddress.city ||
      !shippingAddress.postalCode
    ) {
      showToast('Please complete all required delivery fields.', 'error');
      return;
    }

    if (paymentMethod === 'card') {
      if (
        !cardDetails.cardHolder ||
        !cardDetails.cardNumber ||
        !cardDetails.cardExpiry ||
        !cardDetails.cardCvv
      ) {
        showToast('Please complete your credit/debit card payment details.', 'error');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const orderItems = cart.map((item) => {
        const img = item.product.images?.[0];
        const cleanImage = img && typeof img === 'string' && !img.startsWith('data:') && img.length < 300 ? img : null;
        return {
          id: Math.random().toString(36).substring(2, 9),
          product_id: item.product.id,
          product_name: item.product.name,
          product_brand: item.product.brand,
          product_image: cleanImage,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity,
          variant: item.selectedSizeOrVariant || item.product.sizeOrVariant || null,
        };
      });

      const finalPaymentMethodName =
        paymentMethod === 'yoco'
          ? 'Yoco Secure Gateway'
          : paymentMethod === 'ozow'
          ? `Instant EFT (${selectedBank})`
          : paymentMethod === 'card'
          ? 'Credit / Debit Card'
          : paymentMethod === 'payfast'
          ? 'PayFast Gateway'
          : paymentMethod === 'paypal'
          ? 'PayPal Checkout'
          : paymentMethod === 'peach_payments'
          ? 'Peach Payments'
          : 'Cash on Delivery';

      // 1. Create or reuse order in Supabase public.orders database table first
      let createdOrder: Order | null = null;
      const cachedPendingOrderId = sessionStorage.getItem('kud_pending_checkout_order_id');

      // Prevent duplicate orders from repeated checkout attempts with the same cart/session
      if (cachedPendingOrderId && paymentMethod === 'yoco') {
        try {
          const existingPending = await orderService.getOrderById(cachedPendingOrderId);
          const currentTotal = totalAmount;
          if (
            existingPending &&
            existingPending.payment_status === 'pending' &&
            Math.abs(existingPending.total_amount - currentTotal) < 0.01
          ) {
            console.log('[CHECKOUT] Reusing existing pending order for repeated Yoco checkout attempt:', cachedPendingOrderId);
            createdOrder = existingPending;
          }
        } catch (reuseErr) {
          console.warn('[CHECKOUT] Could not reuse cached pending order:', reuseErr);
        }
      }

      if (!createdOrder) {
        createdOrder = await orderService.createOrder(
          orderItems,
          shippingAddress,
          cartSubtotal,
          deliveryFee,
          discountAmount,
          finalPaymentMethodName,
          user?.id,
          {
            tax_enabled: taxSettings.tax_enabled,
            tax_name: taxSettings.tax_name,
            tax_rate: taxSettings.tax_rate,
            tax_amount: taxAmount,
            show_tax_on_receipt: taxSettings.show_tax_on_receipt,
            vat_registration_number: taxSettings.vat_registration_number,
          }
        );
        if (createdOrder?.id) {
          sessionStorage.setItem('kud_pending_checkout_order_id', createdOrder.id);
        }
      }

      // Verify that createdOrder.id exists
      if (!createdOrder || !createdOrder.id) {
        throw new Error('Order creation failed. Database order ID was not returned.');
      }

      // Handle Yoco Hosted Checkout
      if (paymentMethod === 'yoco') {
        showToast('Connecting to Yoco Hosted Checkout...', 'info');

        // Console logging showing only createdOrder.id, orderNumber, and total
        console.log('[YOCO CHECKOUT REACT LOG]', {
          createdOrderId: createdOrder.id,
          orderNumber: createdOrder.order_number,
          total: createdOrder.total_amount,
        });

        // Invoke Edge Function with body: { orderId: createdOrder.id }
        const { data: yocoData, error: yocoError } = await supabase.functions.invoke('create-yoco-checkout', {
          body: {
            orderId: createdOrder.id,
          },
        });

        if (yocoError || !yocoData) {
          console.error('Yoco checkout Edge Function error:', yocoError);
          const errMsg = yocoError?.message || yocoData?.error || 'Failed to initialize Yoco Hosted Checkout.';
          setPaymentError(errMsg);
          showToast(`Yoco Checkout Error: ${errMsg}`, 'error');
          setIsSubmitting(false);
          return;
        }

        if (!yocoData.redirectUrl) {
          const errMsg = yocoData?.error || 'Yoco Checkout Error: orderId parameter is required or invalid response';
          setPaymentError(errMsg);
          showToast(`Yoco Checkout Error: ${errMsg}`, 'error');
          setIsSubmitting(false);
          return;
        }

        // CRITICAL PAYMENT FLOW REQUIREMENT:
        // Do NOT clear customer's cart when redirecting to YOCO!
        // The cart must remain intact if the customer cancels, closes the tab, or payment fails.
        // The cart will ONLY be cleared after verified payment confirmation by Yoco webhook/server.
        showToast('Redirecting to Yoco payment portal...', 'success');

        // Redirect using window.location.href
        window.location.href = yocoData.redirectUrl;
        return;
      }

      // Handle Direct Card Payment / Cash on Delivery / Other methods
      clearCart();
      showToast(
        paymentMethod === 'card'
          ? 'Card payment processed successfully!'
          : paymentMethod === 'cod'
          ? 'Order placed with Cash on Delivery!'
          : 'Order placed successfully!',
        'success'
      );
      navigate(`/orders/${createdOrder.id}`);
    } catch (err: any) {
      console.error('Order processing error:', err);
      const errMsg = err?.message || 'An error occurred while placing your order.';
      setPaymentError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead
        title={`Secure Checkout | ${STORE_CONFIG.STORE_NAME}`}
        description="Secure checkout with Yoco payment integration."
        canonicalPath="/checkout"
        noindex={true}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">
      {/* Back button */}
      <button
        onClick={() => navigate('/cart')}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 px-3.5 py-1.5 rounded-full transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Cart</span>
      </button>

      <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-6">
        Checkout
      </h1>

      {cancelNotice && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-sm font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>{cancelNotice}</span>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Delivery & Payment Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Shipping Address */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
              <Truck className="w-5 h-5 text-[#ff6452]" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Delivery Information</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="e.g. Thabo Mokoena"
                  value={shippingAddress.fullName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:border-[#ff6452] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="thabo@example.co.za"
                  value={shippingAddress.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:border-[#ff6452] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  South African Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="+27 82 123 4567"
                  value={shippingAddress.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:border-[#ff6452] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Street Address / Complex / Suburb *
                </label>
                <input
                  type="text"
                  name="addressLine"
                  required
                  placeholder="12 Jan Smuts Avenue, Rosebank"
                  value={shippingAddress.addressLine}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:border-[#ff6452] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  placeholder="Johannesburg"
                  value={shippingAddress.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:border-[#ff6452] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Province *
                </label>
                <select
                  name="province"
                  value={shippingAddress.province}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:border-[#ff6452] outline-none"
                >
                  {STORE_CONFIG.SOUTH_AFRICAN_PROVINCES.map((prov) => (
                    <option key={prov} value={prov} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Postal Code *
                </label>
                <input
                  type="text"
                  name="postalCode"
                  required
                  placeholder="2196"
                  value={shippingAddress.postalCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:border-[#ff6452] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#ff6452]" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Payment Option</h2>
              </div>
              <span className="text-xs text-gray-400 dark:text-slate-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                256-Bit SSL Encrypted
              </span>
            </div>

            <div className="space-y-3">
              {availablePaymentMethods.length === 0 ? (
                <div className="p-6 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-center text-sm text-gray-500 dark:text-slate-400">
                  Online payment providers are currently being configured by the store administrator. Please try again in a few minutes.
                </div>
              ) : (
                availablePaymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      paymentMethod === method.id
                        ? 'border-[#ff6452] bg-rose-50/30 dark:bg-rose-950/30'
                        : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-850'
                    }`}
                  >
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={paymentMethod === method.id}
                          onChange={() => setPaymentMethod(method.id)}
                          className="accent-[#ff6452]"
                        />
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{method.name}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{method.desc}</p>
                        </div>
                      </div>
                    </label>

                    {/* Card Details Inputs */}
                    {paymentMethod === 'card' && method.id === 'card' && (
                      <div className="mt-4 pt-4 border-t border-rose-100/60 dark:border-slate-800 space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Cardholder Name *
                          </label>
                          <input
                            type="text"
                            name="cardHolder"
                            placeholder="e.g. T Mokoena"
                            value={cardDetails.cardHolder}
                            onChange={handleCardInputChange}
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs focus:border-[#ff6452] outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Card Number *
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              name="cardNumber"
                              maxLength={19}
                              placeholder="4532 •••• •••• 8912"
                              value={cardDetails.cardNumber}
                              onChange={handleCardInputChange}
                              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs focus:border-[#ff6452] outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono"
                            />
                            <CreditCard className="w-4 h-4 text-gray-400 dark:text-slate-400 absolute right-3 top-2.5" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                              Expiry (MM/YY) *
                            </label>
                            <input
                              type="text"
                              name="cardExpiry"
                              maxLength={5}
                              placeholder="08/28"
                              value={cardDetails.cardExpiry}
                              onChange={handleCardInputChange}
                              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs focus:border-[#ff6452] outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono text-center"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                              CVV / CVC *
                            </label>
                            <input
                              type="password"
                              name="cardCvv"
                              maxLength={4}
                              placeholder="•••"
                              value={cardDetails.cardCvv}
                              onChange={handleCardInputChange}
                              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs focus:border-[#ff6452] outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono text-center"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Instant EFT Bank Selection */}
                    {paymentMethod === 'ozow' && method.id === 'ozow' && (
                      <div className="mt-4 pt-4 border-t border-rose-100/60 dark:border-slate-800 space-y-2">
                        <p className="text-xs font-bold text-gray-700 dark:text-slate-300">Select your South African Bank:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            'Capitec Bank',
                            'FNB',
                            'Standard Bank',
                            'ABSA',
                            'Nedbank',
                            'TymeBank',
                          ].map((bank) => (
                            <button
                              type="button"
                              key={bank}
                              onClick={() => setSelectedBank(bank)}
                              className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                                selectedBank === bank
                                  ? 'bg-[#ff6452] text-white border-[#ff6452]'
                                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                              }`}
                            >
                              {bank}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-gray-400 dark:text-slate-400 pt-1">
                          🔒 You will authorize Instant EFT securely via {selectedBank} Capitec Pay / Ozow portal.
                        </p>
                      </div>
                    )}

                    {/* Yoco Gateway info */}
                    {paymentMethod === 'yoco' && method.id === 'yoco' && (
                      <div className="mt-3 pt-3 border-t border-rose-100/60 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-400 space-y-1">
                        <p className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          Secure Yoco Hosted Checkout
                        </p>
                        <p>
                          You will be redirected securely to Yoco to complete payment with Visa, Mastercard, or Instant EFT. No card numbers are handled on our site.
                        </p>
                      </div>
                    )}

                    {/* PayFast Gateway info */}
                    {paymentMethod === 'payfast' && method.id === 'payfast' && (
                      <div className="mt-3 pt-3 border-t border-rose-100/60 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-400 space-y-1">
                        <p className="font-semibold text-gray-800 dark:text-slate-200">
                          PayFast PCI-DSS Level 1 Gateway Integration
                        </p>
                        <p>
                          Your payment is processed securely via PayFast South Africa. Supports Debit Card, Credit Card, Masterpass & Mobicred.
                        </p>
                      </div>
                    )}

                    {/* COD Info */}
                    {paymentMethod === 'cod' && method.id === 'cod' && (
                      <div className="mt-3 pt-3 border-t border-rose-100/60 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-400 space-y-1">
                        <p className="font-semibold text-gray-800 dark:text-slate-200">
                          💵 Pay Cash Upon Courier Delivery
                        </p>
                        <p>
                          Please keep exact cash ({STORE_CONFIG.STORE_CURRENCY}{totalAmount.toLocaleString()}) ready for courier drop-off. Order will be marked as &quot;Pending Payment&quot; until delivered.
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Summary & Place Order Button */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-3">
              Order Items ({cart.length})
            </h2>

            <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar pr-1">
              {cart.map((item, idx) => {
                const checkoutImg =
                  (Array.isArray(item.product.images) &&
                    item.product.images.find(
                      (u) => typeof u === 'string' && u.trim().length > 0 && !u.trim().startsWith('data:image')
                    )) ||
                  (typeof (item.product as any).image_url === 'string' &&
                    !(item.product as any).image_url.trim().startsWith('data:image') &&
                    (item.product as any).image_url.trim()) ||
                  (typeof (item.product as any).image === 'string' &&
                    !(item.product as any).image.trim().startsWith('data:image') &&
                    (item.product as any).image.trim()) ||
                  null;

                return (
                  <div key={`${item.product.id}-${item.selectedSizeOrVariant || ''}-${idx}`} className="flex items-center gap-3 text-sm">
                    {checkoutImg ? (
                      <img
                        src={checkoutImg}
                        alt={item.product.name}
                        className="w-12 h-12 rounded-xl object-cover bg-gray-50 dark:bg-slate-800 shrink-0 border border-gray-100 dark:border-slate-800"
                        onError={(e) => {
                          const el = e.currentTarget;
                          el.style.display = 'none';
                          if (el.parentElement) {
                            const placeholder = document.createElement('div');
                            placeholder.className = 'w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 shrink-0 border border-gray-100 dark:border-slate-800 select-none p-1';
                            placeholder.title = 'Image unavailable';
                            placeholder.innerHTML = '<span class="text-[7px] font-medium text-center leading-none">Image unavailable</span>';
                            el.parentElement.appendChild(placeholder);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 shrink-0 border border-gray-100 dark:border-slate-800 select-none p-1" title="Image unavailable">
                        <ImageOff className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                        <span className="text-[7px] font-medium text-center leading-none mt-0.5">Image unavailable</span>
                      </div>
                    )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-400">
                      Qty: {item.quantity} {item.selectedSizeOrVariant && `• ${item.selectedSizeOrVariant}`}
                    </p>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {STORE_CONFIG.STORE_CURRENCY}
                    {(item.product.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>

            <div className="border-t border-gray-100 dark:border-slate-800 pt-3 space-y-2 text-sm text-gray-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {STORE_CONFIG.STORE_CURRENCY}{cartSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {taxSettings.tax_enabled && (
                <div className="flex justify-between text-amber-700 dark:text-amber-400">
                  <span>{taxSettings.tax_name} ({taxSettings.tax_rate}%)</span>
                  <span className="font-semibold">
                    {STORE_CONFIG.STORE_CURRENCY}{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {deliveryFee === 0 ? 'FREE' : `${STORE_CONFIG.STORE_CURRENCY}${deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
              </div>
              <div className="border-t border-gray-100 dark:border-slate-800 pt-3 flex justify-between items-baseline">
                <span className="font-bold text-gray-900 dark:text-white">Total</span>
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {STORE_CONFIG.STORE_CURRENCY}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {paymentError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-medium flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 dark:text-rose-400" />
                <span>{paymentError}</span>
              </div>
            )}

            {paymentSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-medium flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                <span>Payment authorized successfully! Directing to order summary...</span>
              </div>
            )}

            <AccountStatusCheckoutGuard showAlertBanner={true}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-[#ff6452] hover:bg-[#ff523d] disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-[#ff6452]/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>
                      {paymentMethod === 'yoco'
                        ? 'Connecting to Yoco Hosted Checkout...'
                        : paymentMethod === 'card'
                        ? 'Authorizing Card Payment...'
                        : paymentMethod === 'cod'
                        ? 'Placing COD Order...'
                        : 'Processing Order...'}
                    </span>
                  </>
                ) : (
                  <span>
                    {paymentMethod === 'yoco'
                      ? 'Pay Now with Yoco'
                      : paymentMethod === 'card'
                      ? 'Pay with Card'
                      : paymentMethod === 'cod'
                      ? 'Place Order (Cash on Delivery)'
                      : paymentMethod === 'ozow'
                      ? 'Pay via Instant EFT'
                      : 'Confirm & Complete Order'}
                  </span>
                )}
              </button>
            </AccountStatusCheckoutGuard>
          </div>
        </div>
      </form>
    </div>
    </>
  );
};
