import React, { useState, useEffect } from 'react';
import {
  Gift,
  ShieldAlert,
  ShieldCheck,
  EyeOff,
  Eye,
  UserX,
  UserCheck,
  Share2,
  DollarSign,
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ShoppingBag,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Snowflake,
  Mail,
} from 'lucide-react';
import { Customer, UserReferralRewardsState, ReferralCommissionRecord } from '../../types';
import { STORE_CONFIG } from '../../constants/config';
import { AdjustCustomerReferralModal } from './AdjustCustomerReferralModal';
import { adminService } from '../../services/adminService';

interface AdminCustomerReferralCardProps {
  customer: Customer;
  onCustomerUpdated: (updatedCustomer: Customer) => void;
}

export const AdminCustomerReferralCard: React.FC<AdminCustomerReferralCardProps> = ({
  customer,
  onCustomerUpdated,
}) => {
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [banReasonInput, setBanReasonInput] = useState<string>('');
  const [showBanReasonBox, setShowBanReasonBox] = useState<boolean>(false);
  const [freezeReasonInput, setFreezeReasonInput] = useState<string>('');
  const [showFreezeReasonBox, setShowFreezeReasonBox] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Customer's specific referral commission records
  const [commissions, setCommissions] = useState<ReferralCommissionRecord[]>([]);
  const [isLoadingComms, setIsLoadingComms] = useState<boolean>(true);
  const [allocatingId, setAllocatingId] = useState<string | null>(null);

  const fetchCustomerCommissions = async () => {
    setIsLoadingComms(true);
    try {
      const data = await adminService.getReferralCommissions({ referrerId: customer.id });
      setCommissions(data);
    } catch {
      // Ignored
    } finally {
      setIsLoadingComms(false);
    }
  };

  useEffect(() => {
    fetchCustomerCommissions();
  }, [customer.id]);

  const handleQuickAllocate = async (commissionRecord: ReferralCommissionRecord) => {
    setAllocatingId(commissionRecord.id);
    const res = await adminService.allocateReferralCommission(commissionRecord.id, {
      customAmount: commissionRecord.commissionAmount || 50,
      adminEmail: 'admin@kudstore.com',
      adminNotes: `Allocated via Customer Profile (#${customer.id}). Verified 2+ monthly orders.`,
    });
    setAllocatingId(null);

    if (res.success) {
      showToast(
        `Successfully allocated ${STORE_CONFIG.STORE_CURRENCY}${commissionRecord.commissionAmount || 50} to ${customer.fullName || 'Customer'}!`,
        'success'
      );
      fetchCustomerCommissions();
      // Update parent customer balance
      onCustomerUpdated({
        ...customer,
        referralBalance: (customer.referralBalance ?? 0) + (commissionRecord.commissionAmount || 50),
        totalReferralEarned: (customer.totalReferralEarned ?? 0) + (commissionRecord.commissionAmount || 50),
      });
    } else {
      showToast(res.error || 'Failed to allocate commission', 'error');
    }
  };

  // Extract referral metrics
  const isBanned = customer.referralStatus === 'banned' || Boolean(customer.isReferralBanned);
  const isEarningsFrozen = Boolean(customer.isEarningsFrozen);
  const earningsFrozenReason = customer.earningsFrozenReason || '';
  const frozenAt = customer.frozenAt;
  const hideEarnings = Boolean(customer.hideEarnings);
  const hideInvites = Boolean(customer.hideInvites);
  const referralBalance = customer.referralBalance ?? 0;
  const totalEarned = customer.totalReferralEarned ?? 0;
  const referralCount = customer.referralCount ?? 0;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Helper to build rewards state for modal
  const currentRewardsState: UserReferralRewardsState = {
    userId: customer.id,
    referralBalance,
    totalEarned,
    walletBalance: (customer as any).wallet_balance ?? 50,
    successfulReferralsCount: referralCount,
    pendingReferralsCount: 0,
    isBanned,
    isEarningsFrozen,
    frozenReason: earningsFrozenReason,
    frozenAt,
    hideReferralEarnings: hideEarnings,
    hideInviteOption: hideInvites,
    vouchers: [],
    history: [],
  };

  // Handle Ban / Unban Toggle
  const handleToggleBan = async () => {
    try {
      setIsUpdating(true);
      const newBannedState = !isBanned;
      const reason = newBannedState ? banReasonInput.trim() || 'Restricted by Administrator' : '';

      const res = await adminService.toggleCustomerReferralBan(customer.id, newBannedState, reason);

      if (res.success && res.data) {
        onCustomerUpdated({
          ...customer,
          isReferralBanned: newBannedState,
          referralStatus: newBannedState ? 'banned' : 'active',
          hideInvites: res.data.hideInviteOption,
          hideEarnings: res.data.hideReferralEarnings,
        });

        setShowBanReasonBox(false);
        setBanReasonInput('');
        showToast(
          newBannedState
            ? `Customer #${customer.id} has been banned from the referral program.`
            : `Referral access restored for customer #${customer.id}.`
        );
      } else {
        showToast(res.error || 'Failed to update referral ban state.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to update referral ban state.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Freeze / Unfreeze Referral Earnings Toggle
  const handleToggleFreezeEarnings = async (forceUnfreeze = false) => {
    try {
      setIsUpdating(true);
      const newFrozenState = forceUnfreeze ? false : !isEarningsFrozen;
      const reason = newFrozenState ? (freezeReasonInput.trim() || 'Referral earnings frozen by administrator') : '';

      const res = await adminService.toggleCustomerEarningsFrozen(customer.id, newFrozenState, reason);

      if (res.success && res.data) {
        onCustomerUpdated({
          ...customer,
          isEarningsFrozen: newFrozenState,
          earningsFrozenReason: res.data.frozenReason || '',
          frozenAt: res.data.frozenAt,
        });

        setShowFreezeReasonBox(false);
        setFreezeReasonInput('');
        showToast(
          newFrozenState
            ? `Referral earnings FROZEN for ${customer.fullName || 'customer'}. Resend notification email dispatched to ${customer.email || 'customer'}.`
            : `Referral earnings UNFROZEN for ${customer.fullName || 'customer'}. Resend notification email dispatched to ${customer.email || 'customer'}.`
        );
      } else {
        showToast(res.error || 'Failed to update referral freeze state.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to update referral freeze state.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Toggle Hide Referral Earnings
  const handleToggleHideEarnings = async () => {
    try {
      setIsUpdating(true);
      const newHideState = !hideEarnings;
      const res = await adminService.toggleCustomerHideEarnings(customer.id, newHideState);

      if (res.success && res.data) {
        onCustomerUpdated({
          ...customer,
          hideEarnings: res.data.hideReferralEarnings,
        });

        showToast(
          newHideState
            ? 'Referral earnings metrics are now HIDDEN on customer dashboard.'
            : 'Referral earnings metrics are now VISIBLE on customer dashboard.'
        );
      } else {
        showToast(res.error || 'Failed to toggle referral earnings visibility.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to toggle referral earnings visibility.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Toggle Hide Invite Option
  const handleToggleHideInvite = async () => {
    try {
      setIsUpdating(true);
      const newHideState = !hideInvites;
      const res = await adminService.toggleCustomerHideInvite(customer.id, newHideState);

      if (res.success && res.data) {
        onCustomerUpdated({
          ...customer,
          hideInvites: res.data.hideInviteOption,
        });

        showToast(
          newHideState
            ? 'Invite Friends button & modal are now HIDDEN on customer dashboard.'
            : 'Invite Friends option is now ENABLED on customer dashboard.'
        );
      } else {
        showToast(res.error || 'Failed to toggle invite option visibility.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to toggle invite option visibility.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Balance Adjustments from Modal
  const handleSaveAdjustment = async (adj: {
    amount: number;
    reason: string;
    overrideTotalEarned?: number;
    overrideCount?: number;
  }) => {
    try {
      setIsUpdating(true);
      const res = await adminService.adjustCustomerReferralBalance(customer.id, {
        amount: adj.amount,
        reason: adj.reason,
      });

      if (res.success && res.data) {
        onCustomerUpdated({
          ...customer,
          referralBalance: res.data.referralBalance,
          totalReferralEarned: res.data.totalEarned,
          referralCount: res.data.successfulReferralsCount,
        });

        showToast(
          `Referral balance adjusted successfully. New balance: ${STORE_CONFIG.STORE_CURRENCY}${res.data.referralBalance}`
        );
      } else {
        showToast(res.error || 'Failed to adjust referral balance.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to adjust referral balance.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div id="admin-customer-referrals-card" className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
            isBanned
              ? 'bg-red-100 text-red-600'
              : isEarningsFrozen
              ? 'bg-cyan-100 text-cyan-700'
              : 'bg-emerald-100 text-[#16a34a]'
          }`}>
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-gray-900">Referral Program Controls</h3>
              <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full tracking-wider ${
                isBanned
                  ? 'bg-red-500 text-white'
                  : 'bg-emerald-600 text-white'
              }`}>
                {isBanned ? 'BANNED' : 'ACTIVE'}
              </span>

              {isEarningsFrozen && (
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full tracking-wider bg-cyan-600 text-white flex items-center gap-1">
                  <Snowflake className="w-3 h-3" />
                  <span>EARNINGS FROZEN</span>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Control referral permissions, freeze/unfreeze earnings redemption, manipulate balances, and toggle customer UI visibility
            </p>
          </div>
        </div>

        {/* Action Button: Open Adjust Modal */}
        <button
          onClick={() => setIsAdjustModalOpen(true)}
          className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-2xs active:scale-95 cursor-pointer"
        >
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span>Adjust Balances</span>
        </button>
      </div>

      {/* Freeze Warning Banner if active */}
      {isEarningsFrozen && (
        <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-900 text-xs flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <Snowflake className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-sm block">Referral Earnings are Frozen for this Customer</span>
              <p className="text-cyan-800/90 mt-0.5">
                The customer is currently blocked from redeeming or using accumulated referral earnings (balance: {STORE_CONFIG.STORE_CURRENCY}{referralBalance}).
                {earningsFrozenReason && (
                  <span className="block mt-1 font-semibold text-cyan-950">
                    Reason: {earningsFrozenReason}
                  </span>
                )}
                {frozenAt && (
                  <span className="block text-[10px] text-cyan-700/80 mt-0.5">
                    Frozen on: {new Date(frozenAt).toLocaleString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => handleToggleFreezeEarnings(true)}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
          >
            Unfreeze Now
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 block">Available Balance</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-gray-900">
              {STORE_CONFIG.STORE_CURRENCY}
              {referralBalance.toLocaleString()}
            </span>
            {isEarningsFrozen && (
              <span className="text-[10px] font-black px-1.5 py-0.5 bg-cyan-100 text-cyan-800 rounded-md">
                FROZEN
              </span>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 block">Lifetime Total Earned</span>
          <span className="text-lg font-black text-gray-900">
            {STORE_CONFIG.STORE_CURRENCY}
            {totalEarned.toLocaleString()}
          </span>
        </div>

        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 block">Successful Conversions</span>
          <span className="text-lg font-black text-gray-900">
            {referralCount} <span className="text-xs font-medium text-gray-400">friends</span>
          </span>
        </div>

        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 block">Dashboard Visibility</span>
          <span className={`text-xs font-bold block ${
            hideEarnings || hideInvites ? 'text-amber-600' : 'text-emerald-600'
          }`}>
            {hideEarnings && hideInvites
              ? 'All Hidden'
              : hideEarnings
              ? 'Earnings Hidden'
              : hideInvites
              ? 'Invites Hidden'
              : 'Full Access'}
          </span>
        </div>
      </div>

      {/* Granular Admin Toggles & Manipulation */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
          Admin Manipulation Controls
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Freeze / Unfreeze Referral Earnings Toggle */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isEarningsFrozen ? 'bg-cyan-50/70 border-cyan-300 ring-1 ring-cyan-400/30' : 'bg-gray-50 border-gray-100'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Snowflake className={`w-4 h-4 ${isEarningsFrozen ? 'text-cyan-600' : 'text-gray-400'}`} />
                  <span className="text-xs font-bold text-gray-900">Freeze Earnings</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Blocks redemption and usage of customer's referral earnings.
                </p>
              </div>

              <button
                type="button"
                id="toggle-freeze-earnings-btn"
                disabled={isUpdating}
                onClick={() => {
                  if (!isEarningsFrozen && !showFreezeReasonBox) {
                    setShowFreezeReasonBox(true);
                  } else {
                    handleToggleFreezeEarnings();
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isEarningsFrozen ? 'bg-cyan-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isEarningsFrozen ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Freeze Reason Input Drawer */}
            {showFreezeReasonBox && !isEarningsFrozen && (
              <div className="mt-3 pt-3 border-t border-cyan-200 space-y-2 animate-in fade-in">
                <label className="text-[11px] font-bold text-cyan-900 block">
                  Freeze Reason (Optional):
                </label>
                <input
                  type="text"
                  value={freezeReasonInput}
                  onChange={(e) => setFreezeReasonInput(e.target.value)}
                  placeholder="e.g. Account under compliance audit"
                  className="w-full px-3 py-1.5 bg-white border border-cyan-200 rounded-xl text-xs text-gray-800 outline-none focus:border-cyan-500"
                />
                <p className="text-[10px] text-cyan-700 font-semibold flex items-center gap-1">
                  <Mail className="w-3 h-3 text-cyan-600 shrink-0" />
                  <span>Resend email alert will be sent to <strong>{customer.email || 'customer'}</strong></span>
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowFreezeReasonBox(false)}
                    className="px-2.5 py-1 text-[11px] font-bold text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFreezeEarnings()}
                    className="px-3 py-1 bg-cyan-600 text-white font-bold text-[11px] rounded-xl hover:bg-cyan-700 shadow-2xs"
                  >
                    Confirm Freeze
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Ban / Restrict Customer Toggle */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isBanned ? 'bg-red-50/60 border-red-200' : 'bg-gray-50 border-gray-100'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <UserX className={`w-4 h-4 ${isBanned ? 'text-red-600' : 'text-gray-400'}`} />
                  <span className="text-xs font-bold text-gray-900">Ban from Referrals</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Suspends referral code and earning of new rewards.
                </p>
              </div>

              <button
                type="button"
                id="toggle-ban-referrals-btn"
                disabled={isUpdating}
                onClick={() => {
                  if (!isBanned && !showBanReasonBox) {
                    setShowBanReasonBox(true);
                  } else {
                    handleToggleBan();
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isBanned ? 'bg-red-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isBanned ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Ban Reason Input Drawer */}
            {showBanReasonBox && !isBanned && (
              <div className="mt-3 pt-3 border-t border-red-200/60 space-y-2 animate-in fade-in">
                <label className="text-[11px] font-bold text-red-800 block">
                  Ban Reason (Optional):
                </label>
                <input
                  type="text"
                  value={banReasonInput}
                  onChange={(e) => setBanReasonInput(e.target.value)}
                  placeholder="e.g. Policy violation or suspicious activity"
                  className="w-full px-3 py-1.5 bg-white border border-red-200 rounded-xl text-xs text-gray-800 outline-none focus:border-red-500"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowBanReasonBox(false)}
                    className="px-2.5 py-1 text-[11px] font-bold text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleBan}
                    className="px-3 py-1 bg-red-600 text-white font-bold text-[11px] rounded-xl hover:bg-red-700 shadow-2xs"
                  >
                    Confirm Ban
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Hide Referral Earnings from Dashboard */}
          <div className={`p-4 rounded-2xl border transition-all ${
            hideEarnings ? 'bg-amber-50/60 border-amber-200' : 'bg-gray-50 border-gray-100'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {hideEarnings ? (
                    <EyeOff className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-xs font-bold text-gray-900">Hide Referral Earnings</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Toggles off earnings balance cards on customer dashboard.
                </p>
              </div>

              <button
                type="button"
                id="toggle-hide-earnings-btn"
                disabled={isUpdating}
                onClick={handleToggleHideEarnings}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  hideEarnings ? 'bg-amber-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    hideEarnings ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 4. Hide Invite Option from Dashboard */}
          <div className={`p-4 rounded-2xl border transition-all ${
            hideInvites ? 'bg-amber-50/60 border-amber-200' : 'bg-gray-50 border-gray-100'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Share2 className={`w-4 h-4 ${hideInvites ? 'text-amber-600' : 'text-gray-400'}`} />
                  <span className="text-xs font-bold text-gray-900">Hide Invite Option</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Hides the "Invite Friends" button & modal from customer dashboard.
                </p>
              </div>

              <button
                type="button"
                id="toggle-hide-invites-btn"
                disabled={isUpdating}
                onClick={handleToggleHideInvite}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  hideInvites ? 'bg-amber-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    hideInvites ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Referred Friends & Monthly Commissions Section */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span>Referred Friends &amp; Commission Allocations</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full">
                2 Purchases / Month Rule
              </span>
            </h4>
            <p className="text-[11px] text-gray-400 mt-0.5">
              A referred friend must make at least 2 purchases in a month before referral commission is allocated by admin.
            </p>
          </div>
        </div>

        {isLoadingComms ? (
          <div className="p-4 bg-gray-50 rounded-2xl animate-pulse text-xs text-gray-400">
            Loading referred friends and monthly order counts...
          </div>
        ) : commissions.length === 0 ? (
          <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 text-center space-y-1">
            <p className="text-xs font-bold text-gray-700">No referred clients on record for this customer</p>
            <p className="text-[11px] text-gray-400">
              When friends sign up using this customer's referral code, their monthly purchases will be evaluated here.
            </p>
          </div>
        ) : (
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4">Referred Friend</th>
                    <th className="py-3 px-4">Evaluation Cycle</th>
                    <th className="py-3 px-4">Monthly Orders (Min 2)</th>
                    <th className="py-3 px-4">Commission</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                  {commissions.map((c) => {
                    const isQualified = c.monthlyPurchasesCount >= (c.requiredMonthlyPurchases || 2);
                    return (
                      <tr key={c.id} className="hover:bg-gray-50/50">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{c.referredClientName}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{c.referredClientEmail}</div>
                        </td>

                        <td className="py-3.5 px-4 text-gray-600 font-mono text-[11px]">
                          {c.evaluationMonth || 'Current Month'}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">
                              {c.monthlyPurchasesCount} / {c.requiredMonthlyPurchases || 2} orders
                            </span>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                                isQualified
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isQualified ? 'QUALIFIED' : 'PENDING'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                          {STORE_CONFIG.STORE_CURRENCY}{(c.commissionAmount || 50).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4">
                          {c.status === 'ready_for_allocation' && (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
                              Ready for Admin Allocation
                            </span>
                          )}
                          {c.status === 'pending_qualification' && (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Awaiting 2nd Purchase
                            </span>
                          )}
                          {c.status === 'allocated' && (
                            <span className="inline-flex items-center gap-1 text-purple-700 font-bold text-[10px] bg-purple-50 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3 text-purple-600" />
                              Allocated to Balance
                            </span>
                          )}
                          {c.status === 'declined' && (
                            <span className="inline-flex items-center gap-1 text-red-700 font-bold text-[10px] bg-red-50 px-2 py-0.5 rounded-full">
                              <X className="w-3 h-3 text-red-600" />
                              Declined
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {c.status === 'ready_for_allocation' && (
                            <button
                              type="button"
                              onClick={() => handleQuickAllocate(c)}
                              disabled={allocatingId === c.id}
                              className="px-3 py-1 bg-[#16a34a] hover:bg-[#15803d] text-white text-[11px] font-bold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>
                                {allocatingId === c.id ? 'Crediting...' : `Allocate ${STORE_CONFIG.STORE_CURRENCY}${c.commissionAmount || 50}`}
                              </span>
                            </button>
                          )}

                          {c.status === 'allocated' && (
                            <span className="text-[11px] font-bold text-emerald-700">✓ Credited</span>
                          )}
                          {c.status === 'pending_qualification' && (
                            <span className="text-[10px] text-gray-400">Needs ≥ 2 orders</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal for balance adjustment */}
      <AdjustCustomerReferralModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        customerName={customer.fullName || 'Customer'}
        customerEmail={customer.email}
        rewardsState={currentRewardsState}
        onSaveAdjustment={handleSaveAdjustment}
      />
    </div>
  );
};
