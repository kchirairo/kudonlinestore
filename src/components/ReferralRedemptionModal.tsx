import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Gift,
  Tag,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Clock,
  Loader2,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Info,
  Snowflake,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { STORE_CONFIG } from '../constants/config';
import { referralService } from '../services/referralService';
import {
  RedemptionType,
  ReferralRewardRedemption,
  UserReferralRewardsState,
} from '../types';

interface ReferralRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: RedemptionType;
  onSuccess?: (redemption: ReferralRewardRedemption) => void;
}

export const ReferralRedemptionModal: React.FC<ReferralRedemptionModalProps> = ({
  isOpen,
  onClose,
  initialType = 'discount_voucher',
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { user, showToast } = useShop();

  const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select');
  const [selectedType, setSelectedType] = useState<RedemptionType>(initialType);
  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [customAmountInput, setCustomAmountInput] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // Rewards data state
  const [rewardsState, setRewardsState] = useState<UserReferralRewardsState | null>(null);
  const [isLoadingState, setIsLoadingState] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success result state
  const [completedRedemption, setCompletedRedemption] = useState<ReferralRewardRedemption | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Load user's latest referral rewards state
  const loadUserRewards = async () => {
    setIsLoadingState(true);
    try {
      const data = await referralService.getUserRewards(user?.id || 'demo-user');
      setRewardsState(data);
      if (data.referralBalance > 0 && selectedAmount > data.referralBalance) {
        setSelectedAmount(Math.min(50, data.referralBalance));
      }
    } catch (err) {
      console.warn('Error loading rewards in modal:', err);
    } finally {
      setIsLoadingState(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setErrorMessage(null);
      setCompletedRedemption(null);
      setSelectedType(initialType);
      loadUserRewards();
    }
  }, [isOpen, initialType, user?.id]);

  if (!isOpen) return null;

  const currentBalance = rewardsState?.referralBalance ?? 0;
  const currentWallet = rewardsState?.walletBalance ?? 0;
  const isEarningsFrozen = Boolean(rewardsState?.isEarningsFrozen);

  // Active redemption amount (either preset or custom)
  const activeAmount = isCustomMode
    ? Math.max(0, parseInt(customAmountInput, 10) || 0)
    : selectedAmount;

  const remainingBalance = Math.max(0, currentBalance - activeAmount);

  const presetTiers = [50, 100, 150].filter((t) => t <= currentBalance || t === 50);

  const handleSelectTier = (amount: number) => {
    setIsCustomMode(false);
    setSelectedAmount(amount);
    setErrorMessage(null);
  };

  const handleCustomAmountChange = (val: string) => {
    const numeric = val.replace(/\D/g, '');
    setCustomAmountInput(numeric);
    setErrorMessage(null);
  };

  const handleProceedToConfirm = () => {
    if (isEarningsFrozen) {
      setErrorMessage('Your referral earnings are currently frozen by an administrator. Redemptions are temporarily blocked.');
      return;
    }

    if (currentBalance <= 0) {
      setErrorMessage('You do not have any available referral rewards balance to redeem yet.');
      return;
    }

    if (activeAmount <= 0) {
      setErrorMessage('Please select or enter an amount greater than R0 to redeem.');
      return;
    }

    if (activeAmount > currentBalance) {
      setErrorMessage(`Cannot redeem more than your available balance of ${STORE_CONFIG.STORE_CURRENCY}${currentBalance}.`);
      return;
    }

    setErrorMessage(null);
    setStep('confirm');
  };

  const handleExecuteRedemption = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await referralService.redeemReward(
        user?.id || 'demo-user',
        selectedType,
        activeAmount
      );

      if (result.success && result.redemption) {
        setCompletedRedemption(result.redemption);
        if (result.rewardState) {
          setRewardsState(result.rewardState);
        }
        setStep('success');

        if (selectedType === 'discount_voucher') {
          showToast(`Voucher ${result.redemption.voucherCode} generated for ${STORE_CONFIG.STORE_CURRENCY}${activeAmount}!`, 'success');
        } else {
          showToast(`${STORE_CONFIG.STORE_CURRENCY}${activeAmount} credited directly to your KUD Wallet!`, 'success');
        }

        if (onSuccess) {
          onSuccess(result.redemption);
        }
      } else {
        const msg = result.error || 'Failed to complete redemption. Please try again.';
        setErrorMessage(msg);
        showToast(msg, 'error');
      }
    } catch (err: any) {
      const msg = err?.message || 'Network error during redemption.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyVoucherCode = async () => {
    if (!completedRedemption?.voucherCode) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(completedRedemption.voucherCode);
      } else {
        const ta = document.createElement('textarea');
        ta.value = completedRedemption.voucherCode;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedCode(true);
      showToast('Voucher code copied to clipboard!', 'success');
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      showToast('Failed to copy voucher code', 'error');
    }
  };

  return (
    <div
      id="referral-redemption-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[28px] shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden relative my-auto transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Dismiss Button */}
        <button
          id="close-redemption-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer z-10"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="p-6 sm:p-7 text-center bg-gradient-to-b from-[#ecfdf5] via-[#ecfdf5]/40 to-transparent dark:from-emerald-950/30 dark:via-emerald-950/10 pb-4">
          <div className="relative inline-block mb-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-gradient-to-br from-[#22c55e] to-[#15803d] text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
              {selectedType === 'discount_voucher' ? (
                <Tag className="w-7 h-7 sm:w-8 sm:h-8" />
              ) : (
                <Wallet className="w-7 h-7 sm:w-8 sm:h-8" />
              )}
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ef4444] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
              <Sparkles className="w-3 h-3" />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {step === 'success' ? (
              <span className="text-[#16a34a] dark:text-[#22c55e]">Redemption Successful!</span>
            ) : step === 'confirm' ? (
              <span>Confirm Reward Redemption</span>
            ) : (
              <span>Redeem Referral Rewards</span>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {step === 'success'
              ? 'Your reward has been activated and updated in your account.'
              : step === 'confirm'
              ? 'Review the details below before finalizing your reward conversion.'
              : 'Convert your referral reward balance into an instant discount voucher or digital wallet credit.'}
          </p>

          {/* Current Referral Rewards Balance Pill */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/60 shadow-2xs">
            {isEarningsFrozen ? (
              <Snowflake className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            ) : (
              <Gift className="w-4 h-4 text-[#16a34a] dark:text-[#22c55e]" />
            )}
            <span className="text-xs font-medium text-gray-600 dark:text-slate-300">
              Available Balance:
            </span>
            <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 font-mono">
              {STORE_CONFIG.STORE_CURRENCY}{currentBalance.toLocaleString()}
            </span>
            {isEarningsFrozen && (
              <span className="ml-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                Frozen
              </span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 pt-2 space-y-5 max-h-[70vh] overflow-y-auto">
          {isEarningsFrozen && (
            <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-cyan-900 dark:text-cyan-200 text-xs flex items-start gap-3">
              <Snowflake className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm">Referral Earnings Frozen</p>
                <p className="text-cyan-800/90 dark:text-cyan-300/90 leading-relaxed">
                  Your referral earnings have been frozen by an administrator. Redemptions and conversions into vouchers or wallet funds are temporarily unavailable.
                  {rewardsState?.frozenReason ? ` (Reason: "${rewardsState.frozenReason}")` : ''}
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-semibold block">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* STEP 1: SELECT TYPE & AMOUNT */}
          {step === 'select' && (
            <div className="space-y-5">
              {/* Option A & B Cards */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 block">
                  Choose Redemption Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Discount Voucher */}
                  <button
                    id="redeem-option-voucher-btn"
                    type="button"
                    onClick={() => {
                      setSelectedType('discount_voucher');
                      setErrorMessage(null);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      selectedType === 'discount_voucher'
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-[#16a34a] dark:border-emerald-500 ring-2 ring-[#16a34a]/20 shadow-xs'
                        : 'bg-white dark:bg-slate-800/80 border-gray-200 dark:border-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-[#16a34a] dark:text-emerald-400 flex items-center justify-center">
                        <Tag className="w-5 h-5" />
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          selectedType === 'discount_voucher'
                            ? 'border-[#16a34a] bg-[#16a34a] text-white'
                            : 'border-gray-300 dark:border-slate-600'
                        }`}
                      >
                        {selectedType === 'discount_voucher' && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-1">
                        <span>Discount Voucher</span>
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Generates a promo coupon code to enter at cart or checkout.
                      </p>
                    </div>
                    <span className="inline-block mt-3 text-[10px] font-bold text-[#16a34a] dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md self-start">
                      Instant Coupon Code
                    </span>
                  </button>

                  {/* Option 2: Wallet Credit */}
                  <button
                    id="redeem-option-wallet-btn"
                    type="button"
                    onClick={() => {
                      setSelectedType('wallet_credit');
                      setErrorMessage(null);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      selectedType === 'wallet_credit'
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white dark:bg-slate-800/80 border-gray-200 dark:border-slate-700 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          selectedType === 'wallet_credit'
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-300 dark:border-slate-600'
                        }`}
                      >
                        {selectedType === 'wallet_credit' && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-1">
                        <span>Store Wallet Credit</span>
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Credits your digital KUD Wallet to offset future order totals.
                      </p>
                    </div>
                    <span className="inline-block mt-3 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/40 px-2 py-0.5 rounded-md self-start">
                      Auto-Deducted Balance
                    </span>
                  </button>
                </div>
              </div>

              {/* Amount Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Select Amount to Redeem
                  </label>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    Max: <strong>{STORE_CONFIG.STORE_CURRENCY}{currentBalance}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {presetTiers.map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => handleSelectTier(tier)}
                      disabled={currentBalance < tier && currentBalance > 0}
                      className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer border ${
                        !isCustomMode && selectedAmount === tier
                          ? 'bg-[#16a34a] text-white border-[#16a34a] shadow-xs'
                          : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
                      } ${currentBalance < tier ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {STORE_CONFIG.STORE_CURRENCY}{tier}
                    </button>
                  ))}

                  {/* All / Max Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectTier(currentBalance)}
                    disabled={currentBalance <= 0}
                    className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer border ${
                      !isCustomMode && selectedAmount === currentBalance && currentBalance > 0
                        ? 'bg-[#16a34a] text-white border-[#16a34a] shadow-xs'
                        : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
                    }`}
                  >
                    All (R{currentBalance})
                  </button>
                </div>

                {/* Custom Amount Input Option */}
                <div className="pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(!isCustomMode)}
                      className="text-xs font-semibold text-[#16a34a] dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      {isCustomMode ? 'Use preset amounts' : 'Or enter custom amount'}
                    </button>
                  </div>

                  {isCustomMode && (
                    <div className="mt-2 relative">
                      <span className="absolute inset-y-0 left-3 flex items-center font-bold text-gray-500 text-sm">
                        {STORE_CONFIG.STORE_CURRENCY}
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder={`Up to ${currentBalance}`}
                        value={customAmountInput}
                        onChange={(e) => handleCustomAmountChange(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#16a34a]/30"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Calculation Breakdown Preview */}
              <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-200/80 dark:border-slate-700/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-500 dark:text-slate-400">
                  <span>Current Referral Rewards:</span>
                  <span className="font-semibold text-gray-900 dark:text-white font-mono">
                    {STORE_CONFIG.STORE_CURRENCY}{currentBalance}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#ef4444] font-semibold">
                  <span>Redeeming Amount:</span>
                  <span className="font-mono">-{STORE_CONFIG.STORE_CURRENCY}{activeAmount}</span>
                </div>
                <div className="h-px bg-gray-200 dark:bg-slate-700 my-1" />
                <div className="flex items-center justify-between text-gray-700 dark:text-slate-300 font-bold">
                  <span>Remaining Referral Balance:</span>
                  <span className="font-mono">{STORE_CONFIG.STORE_CURRENCY}{remainingBalance}</span>
                </div>

                <div className="mt-2 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#16a34a] shrink-0" />
                  <span className="text-[11px] text-gray-600 dark:text-slate-400">
                    {selectedType === 'discount_voucher' ? (
                      <>You will receive a <strong>{STORE_CONFIG.STORE_CURRENCY}{activeAmount} Discount Voucher</strong> valid for 90 days.</>
                    ) : (
                      <>Your KUD Wallet will increase from <strong>{STORE_CONFIG.STORE_CURRENCY}{currentWallet}</strong> to <strong>{STORE_CONFIG.STORE_CURRENCY}{currentWallet + activeAmount}</strong>.</>
                    )}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                id="proceed-to-confirm-redemption-btn"
                type="button"
                onClick={handleProceedToConfirm}
                disabled={isEarningsFrozen || currentBalance <= 0 || activeAmount <= 0 || activeAmount > currentBalance}
                className="w-full py-3.5 px-6 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base rounded-full shadow-md shadow-red-500/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
              >
                <span>{isEarningsFrozen ? 'Earnings Frozen' : 'Continue to Review'}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          )}

          {/* STEP 2: CONFIRMATION STEP */}
          {step === 'confirm' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="p-5 bg-gradient-to-br from-emerald-50 via-white to-gray-50 dark:from-emerald-950/20 dark:via-slate-800 dark:to-slate-800/80 rounded-3xl border-2 border-emerald-500/30 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/25">
                  <ShieldCheck className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#15803d] dark:text-emerald-400">
                    Confirmation Required
                  </span>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    Convert {STORE_CONFIG.STORE_CURRENCY}{activeAmount} Rewards?
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-slate-400 max-w-xs mx-auto">
                    {selectedType === 'discount_voucher'
                      ? `Your referral balance will be debited by ${STORE_CONFIG.STORE_CURRENCY}${activeAmount} and a unique ${STORE_CONFIG.STORE_CURRENCY}${activeAmount} discount coupon code will be generated.`
                      : `Your referral balance will be debited by ${STORE_CONFIG.STORE_CURRENCY}${activeAmount} and added directly to your digital KUD Wallet balance.`}
                  </p>
                </div>

                {/* Key Transaction Summary Box */}
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 text-left text-xs space-y-1.5 shadow-2xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-slate-400">Redemption Type:</span>
                    <span className="font-bold text-gray-900 dark:text-white capitalize">
                      {selectedType.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-slate-400">Amount:</span>
                    <span className="font-bold text-[#16a34a] dark:text-emerald-400 font-mono">
                      {STORE_CONFIG.STORE_CURRENCY}{activeAmount}.00
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-slate-400">Database Record:</span>
                    <span className="font-semibold text-gray-700 dark:text-slate-300">
                      User Profile &amp; Coupons Table
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-slate-400">Validity:</span>
                    <span className="font-semibold text-gray-700 dark:text-slate-300">
                      {selectedType === 'discount_voucher' ? '90 Days (Active Store Coupon)' : 'No Expiry (KUD Wallet)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="cancel-redemption-confirm-btn"
                  type="button"
                  onClick={() => setStep('select')}
                  disabled={isSubmitting}
                  className="py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-bold text-sm rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Edit</span>
                </button>

                <button
                  id="execute-redemption-confirm-btn"
                  type="button"
                  onClick={handleExecuteRedemption}
                  disabled={isSubmitting}
                  className="py-3 px-4 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-sm rounded-full shadow-md shadow-emerald-500/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Database...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Confirm &amp; Redeem</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS RESULT SCREEN */}
          {step === 'success' && completedRedemption && (
            <div className="space-y-5 text-center animate-in zoom-in-95 duration-200">
              {/* Success Badge */}
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#16a34a] dark:text-[#22c55e] flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              {/* If Discount Voucher: High-Contrast Voucher Ticket */}
              {completedRedemption.type === 'discount_voucher' && completedRedemption.voucherCode ? (
                <div className="space-y-4">
                  <div className="relative p-5 bg-gradient-to-br from-emerald-600 to-[#15803d] text-white rounded-3xl shadow-xl overflow-hidden text-left">
                    {/* Perforated Left/Right cutouts */}
                    <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-900" />
                    <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-900" />

                    <div className="flex items-center justify-between text-emerald-100 text-xs font-bold uppercase tracking-wider mb-2">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        KUD Store Discount Voucher
                      </span>
                      <span>Verified Active</span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2 my-2">
                      <span className="text-3xl sm:text-4xl font-black tracking-tight">
                        {STORE_CONFIG.STORE_CURRENCY}{completedRedemption.amount} OFF
                      </span>
                      <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                        Single-Use
                      </span>
                    </div>

                    <div className="pt-3 border-t border-emerald-400/40 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-emerald-200 block">Voucher Code</span>
                        <span className="font-mono text-base font-black tracking-wider text-white">
                          {completedRedemption.voucherCode}
                        </span>
                      </div>

                      <button
                        id="copy-success-voucher-btn"
                        type="button"
                        onClick={handleCopyVoucherCode}
                        className="px-3.5 py-2 bg-white text-[#15803d] hover:bg-emerald-50 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    This voucher has been registered in the database. Apply it directly on the Cart or Checkout screen!
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      id="apply-voucher-go-to-cart-btn"
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate('/cart');
                      }}
                      className="py-3 px-4 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-xs sm:text-sm rounded-full shadow-md shadow-red-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Use at Cart</span>
                    </button>

                    <button
                      id="finish-redemption-modal-btn"
                      type="button"
                      onClick={onClose}
                      className="py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-bold text-xs sm:text-sm rounded-full transition-all cursor-pointer"
                    >
                      <span>Done</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* If Wallet Credit: Wallet Card Result */
                <div className="space-y-4">
                  <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl shadow-xl text-left space-y-3">
                    <div className="flex items-center justify-between text-blue-100 text-xs font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Wallet className="w-4 h-4" />
                        KUD Store Digital Wallet
                      </span>
                      <span>Credit Added</span>
                    </div>

                    <div>
                      <span className="text-xs text-blue-200 block">Total Active Wallet Balance</span>
                      <span className="text-3xl sm:text-4xl font-black font-mono">
                        {STORE_CONFIG.STORE_CURRENCY}{rewardsState?.walletBalance ?? (currentWallet + activeAmount)}.00
                      </span>
                    </div>

                    <div className="pt-2 border-t border-blue-400/40 text-xs text-blue-100 flex items-center justify-between">
                      <span>Amount Credited:</span>
                      <span className="font-bold">+{STORE_CONFIG.STORE_CURRENCY}{completedRedemption.amount}.00</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Your wallet credit will be automatically suggested at checkout to pay or discount any order!
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      id="wallet-shop-now-btn"
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate('/');
                      }}
                      className="py-3 px-4 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-xs sm:text-sm rounded-full shadow-md shadow-red-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Start Shopping</span>
                    </button>

                    <button
                      id="wallet-done-btn"
                      type="button"
                      onClick={onClose}
                      className="py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-bold text-xs sm:text-sm rounded-full transition-all cursor-pointer"
                    >
                      <span>Done</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
