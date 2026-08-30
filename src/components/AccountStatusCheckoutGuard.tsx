import React, { useState } from 'react';
import { Headphones, AlertTriangle, PauseCircle, Ban, ArrowRight, ShieldAlert, MessageSquare } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { AccountDisabledSupportModal } from './AccountDisabledSupportModal';

interface AccountStatusCheckoutGuardProps {
  /**
   * Optional custom children (the standard checkout button or content) to render when account is active or user is not logged in.
   */
  children?: React.ReactNode;
  /**
   * Optional standard checkout click handler if not using children
   */
  onCheckout?: () => void;
  /**
   * Optional custom text for the standard checkout button
   */
  checkoutLabel?: string;
  /**
   * Optional custom className for standard checkout button
   */
  checkoutClassName?: string;
  /**
   * Custom className for the support button container
   */
  containerClassName?: string;
  /**
   * Whether to show an account alert banner above the support button
   */
  showAlertBanner?: boolean;
}

export const AccountStatusCheckoutGuard: React.FC<AccountStatusCheckoutGuardProps> = ({
  children,
  onCheckout,
  checkoutLabel = 'Proceed to Checkout',
  checkoutClassName,
  containerClassName = '',
  showAlertBanner = true,
}) => {
  const { user, isAccountDisabled, accountStatus, disabledReason } = useShop();
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);

  // If user is not logged in or account is in active standing, render standard checkout button / children
  if (!user || !isAccountDisabled) {
    if (children) {
      return <>{children}</>;
    }

    return (
      <button
        id="standard-checkout-button"
        type="button"
        onClick={onCheckout}
        className={
          checkoutClassName ||
          'w-full py-4 bg-[#ff6452] hover:bg-[#ff523d] text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#ff6452]/20 transition-all active:scale-[0.98] cursor-pointer'
        }
      >
        <span>{checkoutLabel}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    );
  }

  // Account is disabled or on hold: Replace the checkout button with "Contact Support"
  const isOnHold = accountStatus === 'on_hold';

  return (
    <div className={`space-y-3 ${containerClassName}`} id="account-disabled-checkout-guard">
      {/* Informational Alert Box */}
      {showAlertBanner && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-medium flex items-start gap-2.5 ${
            isOnHold
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200'
          }`}
        >
          {isOnHold ? (
            <PauseCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          ) : (
            <Ban className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-xs">
              {isOnHold ? 'Account Temporarily On Hold' : 'Account Disabled by Administration'}
            </p>
            <p className="mt-0.5 text-[11px] opacity-90 leading-relaxed">
              {disabledReason
                ? `Note: ${disabledReason}`
                : isOnHold
                ? 'Your checkout privileges are currently paused. Please contact customer support for verification.'
                : 'Your account has been restricted from checkout and purchasing. Contact support to appeal.'}
            </p>
          </div>
        </div>
      )}

      {/* Replacement "Contact Support" Button */}
      <button
        id="disabled-account-contact-support-button"
        type="button"
        onClick={() => setIsSupportModalOpen(true)}
        className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-[0.98] cursor-pointer text-white ${
          isOnHold
            ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
            : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
        }`}
      >
        <Headphones className="w-5 h-5 shrink-0" />
        <span>Contact Support to Unlock Checkout</span>
      </button>

      {/* Direct Support Modal */}
      <AccountDisabledSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />
    </div>
  );
};
