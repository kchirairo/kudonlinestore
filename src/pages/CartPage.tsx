import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { STORE_CONFIG } from '../constants/config';
import { EmptyState } from '../components/EmptyState';
import { SEOHead } from '../components/SEOHead';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, cartSubtotal, deliveryFee, showToast, user } = useShop();

  const [couponCode, setCouponCode] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string>('');

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (code === 'KUD50') {
      setDiscountAmount(50);
      setAppliedCoupon('KUD50');
      showToast('R50 discount applied!');
    } else if (code === 'WELCOME10') {
      const disc = Math.round(cartSubtotal * 0.1);
      setDiscountAmount(disc);
      setAppliedCoupon('WELCOME10');
      showToast(`10% discount (-R${disc}) applied!`);
    } else {
      showToast('Invalid promo code. Try "KUD50" or "WELCOME10"', 'error');
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
                <div
                  onClick={() => navigate(`/product/${item.product.id}`)}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-800 cursor-pointer shrink-0 border border-gray-100 dark:border-slate-800"
                >
                  <img
                    src={
                      (Array.isArray(item.product.images) && item.product.images.find((u) => typeof u === 'string' && u.trim().length > 0)) ||
                      (typeof (item.product as any).image_url === 'string' && (item.product as any).image_url.trim()) ||
                      (typeof (item.product as any).image === 'string' && (item.product as any).image.trim()) ||
                      'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=400&q=80'
                    }
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

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

            <button
              onClick={() => {
                if (!user) {
                  showToast('Please sign in to proceed to checkout', 'info');
                  navigate('/account', { state: { returnUrl: '/checkout' } });
                  return;
                }
                navigate('/checkout');
              }}
              className="w-full py-4 bg-[#ff6452] hover:bg-[#ff523d] text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#ff6452]/20 transition-all active:scale-[0.98] mt-2 cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

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
