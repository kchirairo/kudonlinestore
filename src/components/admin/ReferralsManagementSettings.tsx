import React, { useState, useEffect } from 'react';
import {
  Gift,
  Save,
  CheckCircle2,
  AlertCircle,
  EyeOff,
  Share2,
  Trophy,
  ShieldCheck,
  Percent,
  Clock,
  Coins,
  DollarSign,
  Info,
  Mail,
  Send,
  Loader2,
  Wallet,
} from 'lucide-react';
import { StoreReferralGlobalConfig } from '../../types';
import { DEFAULT_REFERRAL_SETTINGS, STORE_CONFIG } from '../../constants/config';
import { adminService } from '../../services/adminService';

export const ReferralsManagementSettings: React.FC = () => {
  const [config, setConfig] = useState<StoreReferralGlobalConfig>(DEFAULT_REFERRAL_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Email test state
  const [testEmailRecipient, setTestEmailRecipient] = useState<string>('admin@kudstore.com');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState<boolean>(false);
  const [testEmailFeedback, setTestEmailFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTestEmail = async (type: 'commission' | 'freeze' | 'unfreeze') => {
    try {
      setIsSendingTestEmail(true);
      setTestEmailFeedback(null);

      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: testEmailRecipient.trim() || 'admin@kudstore.com',
          type,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestEmailFeedback({
          success: true,
          message: data.message || `Test ${type} email successfully generated!`,
        });
      } else {
        setTestEmailFeedback({
          success: false,
          message: data.error || 'Failed to dispatch test email.',
        });
      }
    } catch (err: any) {
      setTestEmailFeedback({
        success: false,
        message: err?.message || 'Error communicating with email service.',
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  useEffect(() => {
    async function loadConfig() {
      try {
        setIsLoading(true);
        const remote = await adminService.getStoreReferralConfig();
        setConfig(remote);
      } catch (err: any) {
        console.warn('[ReferralsSettings] Error loading config:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSaveSuccess(false);

      await adminService.saveStoreReferralConfig(config);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save referral configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4" />
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#ff6452]" />
            Referral & Loyalty Program Settings
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Configure global referral earnings, invitation visibility, gamification leaderboards, and voucher redemption rules.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 bg-[#ff6452] hover:bg-[#e05342] text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <span>Saving...</span>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Referral Settings</span>
            </>
          )}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300 font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Global referral program settings saved and synchronized across all store dashboards!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl flex items-center gap-3 text-xs text-red-800 dark:text-red-300 font-bold animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Global Program Visibility & Master Toggles */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-5">
        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
          Global Visibility & Program Controls
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Master Program Toggle */}
          <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#16a34a]" />
                Enable Referral Program
              </span>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Master switch to activate or pause the entire customer referral rewards system.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfig({ ...config, isProgramEnabled: !config.isProgramEnabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.isProgramEnabled ? 'bg-[#16a34a]' : 'bg-gray-200 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  config.isProgramEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Hide Referral Earnings Globally */}
          <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-amber-500" />
                Hide Referral Earnings Globally
              </span>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Hides referral reward amounts and balances on all customer dashboards.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setConfig({
                  ...config,
                  hideReferralEarningsGlobally: !config.hideReferralEarningsGlobally,
                })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.hideReferralEarningsGlobally ? 'bg-amber-500' : 'bg-gray-200 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  config.hideReferralEarningsGlobally ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Hide Referral Rewards & Wallet from Customer Profile */}
          <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#ff6452]" />
                Hide Referral Rewards &amp; Wallet from Customer Profile
              </span>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Hides the entire "Referral Rewards &amp; Wallet" card, wallet balances, and claimed vouchers from all customer profile dashboards.
              </p>
            </div>
            <button
              type="button"
              id="toggle-hide-referral-wallet-globally"
              onClick={() =>
                setConfig({
                  ...config,
                  hideReferralWalletGlobally: !config.hideReferralWalletGlobally,
                })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.hideReferralWalletGlobally ? 'bg-[#ff6452]' : 'bg-gray-200 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  config.hideReferralWalletGlobally ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Hide Invite Option Globally */}
          <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-amber-500" />
                Hide Invite Option Globally
              </span>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Hides "Invite Friends" buttons, modals, and sharing tools from customer dashboards.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setConfig({
                  ...config,
                  hideInviteOptionGlobally: !config.hideInviteOptionGlobally,
                })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.hideInviteOptionGlobally ? 'bg-amber-500' : 'bg-gray-200 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  config.hideInviteOptionGlobally ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Leaderboard Display Toggle */}
          <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Show Top Referrers Leaderboard
              </span>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Enables the gamification leaderboard component on the customer account page.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setConfig({
                  ...config,
                  allowLeaderboardDisplay: !config.allowLeaderboardDisplay,
                })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.allowLeaderboardDisplay ? 'bg-[#16a34a]' : 'bg-gray-200 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  config.allowLeaderboardDisplay ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Reward Values & Thresholds */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-5">
        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Coins className="w-4 h-4 text-[#ff6452]" />
          Reward Amounts &amp; Redemption Rules
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1.5">
              Referrer Reward ({STORE_CONFIG.STORE_CURRENCY})
            </label>
            <input
              type="number"
              min="0"
              value={config.rewardPerReferral}
              onChange={(e) =>
                setConfig({
                  ...config,
                  rewardPerReferral: Number(e.target.value) || 0,
                })
              }
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-[#ff6452]"
            />
            <p className="text-[10px] text-gray-400 mt-1">Given to user per converted friend</p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1.5">
              Invited Friend Discount ({STORE_CONFIG.STORE_CURRENCY})
            </label>
            <input
              type="number"
              min="0"
              value={config.invitedFriendDiscount}
              onChange={(e) =>
                setConfig({
                  ...config,
                  invitedFriendDiscount: Number(e.target.value) || 0,
                })
              }
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-[#ff6452]"
            />
            <p className="text-[10px] text-gray-400 mt-1">First order voucher for new friend</p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1.5">
              Min Redemption Amount ({STORE_CONFIG.STORE_CURRENCY})
            </label>
            <input
              type="number"
              min="10"
              value={config.minVoucherRedemptionAmount}
              onChange={(e) =>
                setConfig({
                  ...config,
                  minVoucherRedemptionAmount: Number(e.target.value) || 10,
                })
              }
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-[#ff6452]"
            />
            <p className="text-[10px] text-gray-400 mt-1">Min balance to convert to voucher/wallet</p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-1.5">
              Voucher Validity (Days)
            </label>
            <input
              type="number"
              min="7"
              value={config.voucherExpiryDays}
              onChange={(e) =>
                setConfig({
                  ...config,
                  voucherExpiryDays: Number(e.target.value) || 90,
                })
              }
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-[#ff6452]"
            />
            <p className="text-[10px] text-gray-400 mt-1">Days before redeemed vouchers expire</p>
          </div>
        </div>
      </div>

      {/* Admin Referral Commission & Monthly Purchase Qualification Rules */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-emerald-200 dark:border-emerald-900/50 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-[#16a34a] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                Monthly Purchases &amp; Admin Allocation Policy
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                Rule: A referred client must make at least 2 purchases in a month for commission to be allocated by the admin.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 space-y-2">
            <label className="text-xs font-bold text-gray-900 dark:text-white block">
              Min Monthly Purchases Required
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={config.minMonthlyPurchasesRequired ?? 2}
              onChange={(e) =>
                setConfig({
                  ...config,
                  minMonthlyPurchasesRequired: Math.max(1, Number(e.target.value) || 2),
                })
              }
              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-[#16a34a]"
            />
            <p className="text-[10px] text-gray-400">
              Threshold of orders the referred friend must place in a calendar month (default: 2).
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 space-y-2">
            <label className="text-xs font-bold text-gray-900 dark:text-white block">
              Commission Per Qualified Referral ({STORE_CONFIG.STORE_CURRENCY})
            </label>
            <input
              type="number"
              min="0"
              value={config.commissionAmountPerQualifiedReferral ?? 50}
              onChange={(e) =>
                setConfig({
                  ...config,
                  commissionAmountPerQualifiedReferral: Number(e.target.value) || 50,
                })
              }
              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-[#16a34a]"
            />
            <p className="text-[10px] text-gray-400">
              Amount credited to the inviter customer upon admin verification.
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-900 dark:text-white block">
                Require Admin Allocation
              </span>
              <p className="text-[10px] text-gray-500 dark:text-slate-400">
                Commissions must be explicitly approved and allocated in the Admin Commissions Queue.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setConfig({
                  ...config,
                  requireAdminAllocation: !(config.requireAdminAllocation ?? true),
                })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                (config.requireAdminAllocation ?? true) ? 'bg-[#16a34a]' : 'bg-gray-200 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  (config.requireAdminAllocation ?? true) ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Resend Email Notification System Integration */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                Resend Email Notification System
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Automated transactional email dispatch alerting customers of commission credits and earnings holds.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                🎉 Commission Allocated Alert
              </h4>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-slate-300 leading-relaxed">
              Instantly sent when admin verifies that a referred friend made at least 2 monthly purchases and credits the commission to the referrer.
            </p>
          </div>

          <div className="p-4 bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/80 dark:border-cyan-900/40 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              <h4 className="text-xs font-bold text-cyan-950 dark:text-cyan-200">
                ❄️ Earnings Frozen Alert
              </h4>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-slate-300 leading-relaxed">
              Dispatched with administrative audit reason whenever a customer's referral earnings balance is placed on hold.
            </p>
          </div>
        </div>

        {/* Test Email Dispatch Form */}
        <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-3">
          <label className="text-xs font-bold text-gray-800 dark:text-slate-200 block">
            Test Email Notification Dispatch (Resend)
          </label>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="email"
              value={testEmailRecipient}
              onChange={(e) => setTestEmailRecipient(e.target.value)}
              placeholder="Enter recipient email (e.g. admin@kudstore.com)"
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none focus:border-emerald-500"
            />

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                disabled={isSendingTestEmail}
                onClick={() => handleSendTestEmail('commission')}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSendingTestEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Test Commission Email</span>
              </button>

              <button
                type="button"
                disabled={isSendingTestEmail}
                onClick={() => handleSendTestEmail('freeze')}
                className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSendingTestEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Test Freeze Email</span>
              </button>
            </div>
          </div>

          {testEmailFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                testEmailFeedback.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {testEmailFeedback.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{testEmailFeedback.message}</span>
            </div>
          )}
        </div>
      </div>
    </form>
  );
};
