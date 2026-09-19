import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, ShieldCheck, Tag, CheckCircle2, AlertTriangle, Ban, PauseCircle, ImageOff } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { STORE_CONFIG } from '../constants/config';
import { EmptyState } from '../components/EmptyState';
import { SEOHead } from '../components/SEOHead';
import { AccountStatusCheckoutGuard } from '../components/AccountStatusCheckoutGuard';
import { referralService } from '../services/referralService';
import { adminService } from '../services/adminService';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    cart,
    updateQuantity,
    removeFromCart,
    cartSubtotal,
    deliveryFee,
    showToast,
    user,
    isAccountDisabled,
    accountStatus,
    disabledReason,
  } = useShop();

  const [couponCode, setCouponCode] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string>('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState<boolean>(false);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    setIsValidatingCoupon(true);

    try {
      // 1. Built-in promo codes
      if (code === 'KUD50') {
        setDiscountAmount(50);
        setAppliedCoupon('KUD50');
        showToast('R50 discount applied!');
        return;
      } else if (code === 'WELCOME10') {
        const disc = Math.round(cartSubtotal * 0.1);
        setDiscountAmount(disc);
        setAppliedCoupon('WELCOME10');
        showToast(`10% discount (-R${disc}) applied!`);
        return;
      }

      // 2. Referral Reward Discount Vouchers (format: KUD-REWARD-<amount>-<suffix>)
      if (code.startsWith('KUD-REWARD-')) {
        const parts = code.split('-');
        const parsedAmount = Number(parts[2]);
        if (!isNaN(parsedAmount) && parsedAmount > 0) {
          const actualDiscount = Math.min(parsedAmount, cartSubtotal);
          setDiscountAmount(actualDiscount);
          setAppliedCoupon(code);
          showToast(`Referral Reward voucher applied! -${STORE_CONFIG.STORE_CURRENCY}${actualDiscount} OFF`, 'success');
          return;
        }
      }

      // 3. User's redeemed vouchers check
      if (user?.id) {
        const userRewards = await referralService.getUserRewards(user.id);
        const matchingVoucher = userRewards.vouchers.find(
          (v) => v.voucherCode?.toUpperCase() === code && v.status === 'active'
        );
        if (matchingVoucher) {
          const actualDiscount = Math.min(matchingVoucher.amount, cartSubtotal);
          setDiscountAmount(actualDiscount);
          setAppliedCoupon(code);
          showToast(`Referral voucher applied! -${STORE_CONFIG.STORE_CURRENCY}${actualDiscount} OFF`, 'success');
          return;
        }
      }

      // 4. Global store coupons check
      const coupons = await adminService.getCoupons();
      const match = coupons.find((c) => c.code.toUpperCase() === code && c.isActive);
      if (match) {
        let disc = 0;
        if (match.discountType === 'percentage') {
          disc = Math.round((cartSubtotal * match.discountValue) / 100);
        } else {
          disc = match.discountValue;
        }
        disc = Math.min(disc, cartSubtotal);
        setDiscountAmount(disc);
        setAppliedCoupon(code);
        showToast(`Coupon "${code}" applied (-${STORE_CONFIG.STORE_CURRENCY}${disc})!`, 'success');
        return;
      }

      showToast('Invalid promo code. Try "KUD50", "WELCOME10", or your redeemed referral voucher.', 'error');
    } catch {
      showToast('Could not validate coupon. Please try again.', 'error');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const totalAmount = Math.max(0, cartSubtotal + deliveryFee - discountAmount);

  if (cart.length === 0) {
    return (
      <>
        <SEOHead
          title={`Your Shopping Cart | ${STORE_CONFIG.STORE_NAME}`}
          description="View your active cart and prepare for secure checkout."
          canonicalPath="/cart"
          noindex={true}
        />
        <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
          <EmptyState
            icon={ShoppingBag}
            title="Your cart is empty"
            description="Looks like you haven't added any products to your shopping bag yet."
            actionText="Start Shopping"
            onAction={() => navigate('/')}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title={`Your Shopping Cart (${cart.length} items) | ${STORE_CONFIG.STORE_NAME}`}
        description="View your active cart and prepare for secure checkout."
        canonicalPath="/cart"
        noindex={true}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">
      <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-6">
        Shopping Cart ({cart.length})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item, index) => {
            const variantKey = item.selectedSizeOrVariant || item.product.sizeOrVariant || '';
            return (
              <div
                key={`${item.product.id}-${variantKey}-${index}`}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 flex items-center gap-4 shadow-xs hover:border-gray-200 dark:hover:border-slate-700 transition-all"
              >
                {/* Product Thumbnail */}
                {(() => {
                  const cartImg =
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
                    <div
                      onClick={() => navigate(`/product/${item.product.id}`)}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-800 cursor-pointer shrink-0 border border-gray-100 dark:border-slate-800 flex items-center justify-center"
                    >
                      {cartImg ? (
                        <img
                          src={cartImg}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const el = e.currentTarget;
                            el.style.display = 'none';
                            if (el.parentElement) {
                              const placeholder = document.createElement('div');
                              placeholder.className = 'w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 p-2 select-none';
                              placeholder.innerHTML = '<span class="text-[9px] font-medium text-center leading-tight">Image unavailable</span>';
                              el.parentElement.appendChild(placeholder);
                            }
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 p-2 select-none">
                          <ImageOff className="w-5 h-5 text-gray-400 dark:text-slate-500 mb-1" />
                          <span className="text-[9px] font-medium text-center leading-tight">Image unavailable</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                        {item.product.brand}
                      </span>
                      <h3
                        onClick={() => navigate(`/product/${item.product.id}`)}
                        className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-[#ff6452] dark:hover:text-[#ff6452] transition-colors"
                      >
                        {item.product.name}
                      </h3>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product.id, variantKey)}
                      className="text-gray-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-lg transition-colors cursor-pointer"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {variantKey && (
                    <span className="inline-block text-xs font-medium text-gray-500 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {variantKey}
                    </span>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-base font-extrabold text-gray-900 dark:text-white">
                      {STORE_CONFIG.STORE_CURRENCY}
                      {(item.product.price * item.quantity).toLocaleString()}
                    </span>

                    {/* Quantity Controls */}
                    <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-xl p-0.5">
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1, variantKey)
                        }
                        className="w-7 h-7 flex items-center justify-center font-bold text-gray-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-7 text-center text-xs font-bold text-gray-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1, variantKey)
                        }
                        className="w-7 h-7 flex items-center justify-center font-bold text-gray-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Order Summary & Coupon */}
        <div className="space-y-6">
          {/* Coupon Input */}
          <form
            onSubmit={handleApplyCoupon}
            className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 shadow-xs flex items-center gap-2"
          >
            <Tag className="w-4 h-4 text-gray-400 dark:text-slate-400 ml-1" />
            <input
              type="text"
              placeholder="Promo code (e.g. KUD50)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none uppercase font-semibold text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-gray-900 dark:bg-slate-800 hover:bg-black dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border border-transparent dark:border-slate-700"
            >
              Apply
            </button>
          </form>

          {/* Summary Box */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-3">
              Order Summary
            </h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {STORE_CONFIG.STORE_CURRENCY}{cartSubtotal.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-gray-600 dark:text-slate-300">
                <span>Delivery Fee</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">FREE</span>
                  ) : (
                    `${STORE_CONFIG.STORE_CURRENCY}${deliveryFee}`
                  )}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-[#ff6452] font-semibold">
                  <span>Discount ({appliedCoupon})</span>
                  <span>-{STORE_CONFIG.STORE_CURRENCY}{discountAmount}</span>
                </div>
              )}

              <div className="border-t border-gray-100 dark:border-slate-800 pt-3 flex justify-between items-baseline text-base">
                <span className="font-bold text-gray-900 dark:text-white">Total</span>
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {STORE_CONFIG.STORE_CURRENCY}{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <AccountStatusCheckoutGuard
              checkoutLabel="Proceed to Checkout"
              onCheckout={() => {
                if (!user) {
                  showToast('Please sign in to proceed to checkout', 'info');
                  navigate('/account', { state: { returnUrl: '/checkout' } });
                  return;
                }
                navigate('/checkout');
              }}
            />

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-slate-400 pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Encrypted & safe checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};
