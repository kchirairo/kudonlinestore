import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle, Plus, Minus, DollarSign, RefreshCw } from 'lucide-react';
import { UserReferralRewardsState } from '../../types';
import { STORE_CONFIG } from '../../constants/config';

interface AdjustCustomerReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerEmail: string;
  rewardsState: UserReferralRewardsState;
  onSaveAdjustment: (adjustment: {
    amount: number;
    reason: string;
    overrideTotalEarned?: number;
    overrideCount?: number;
  }) => Promise<void>;
}

export const AdjustCustomerReferralModal: React.FC<AdjustCustomerReferralModalProps> = ({
  isOpen,
  onClose,
  customerName,
  customerEmail,
  rewardsState,
  onSaveAdjustment,
}) => {
  const [adjustmentMode, setAdjustmentMode] = useState<'credit' | 'debit' | 'set_direct'>('credit');
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('50');
  const [reason, setReason] = useState<string>('');
  const [directBalance, setDirectBalance] = useState<string>(String(rewardsState.referralBalance || 0));
  const [directTotalEarned, setDirectTotalEarned] = useState<string>(String(rewardsState.totalEarned || 0));
  const [directCount, setDirectCount] = useState<string>(String(rewardsState.successfulReferralsCount || 0));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentBalance = rewardsState.referralBalance || 0;
  const numAmount = Number(adjustmentAmount) || 0;

  let calculatedNewBalance = currentBalance;
  if (adjustmentMode === 'credit') {
    calculatedNewBalance = currentBalance + numAmount;
  } else if (adjustmentMode === 'debit') {
    calculatedNewBalance = Math.max(0, currentBalance - numAmount);
  } else {
    calculatedNewBalance = Math.max(0, Number(directBalance) || 0);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (adjustmentMode !== 'set_direct') {
      if (numAmount <= 0) {
        setErrorMsg('Please enter an adjustment amount greater than zero.');
        return;
      }
      if (!reason.trim()) {
        setErrorMsg('Please enter an administrative reason for this balance adjustment.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      if (adjustmentMode === 'set_direct') {
        const targetBal = Math.max(0, Number(directBalance) || 0);
        const diff = targetBal - currentBalance;
        await onSaveAdjustment({
          amount: diff,
          reason: reason.trim() || 'Manual direct balance & stats override',
          overrideTotalEarned: Number(directTotalEarned) || 0,
          overrideCount: Number(directCount) || 0,
        });
      } else {
        const netAmount = adjustmentMode === 'credit' ? numAmount : -numAmount;
        await onSaveAdjustment({
          amount: netAmount,
          reason: reason.trim(),
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to apply balance adjustment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const presetReasons = [
    'Special campaign promotional bonus credit',
    'Compensation for missed referral conversion',
    'Correction of duplicate referral reward',
    'Manual audit adjustment by administrator',
    'Customer goodwill loyalty credit',
  ];

  return (
    <div
      id="adjust-referral-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="adjust-referral-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-gray-100 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#16a34a]" />
              Adjust Customer Referral Balance
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Managing for <strong className="text-gray-800 dark:text-slate-200">{customerName}</strong> ({customerEmail})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance Summary Box */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
              Current Balance
            </span>
            <span className="text-xl font-black text-emerald-900 dark:text-emerald-200">
              {STORE_CONFIG.STORE_CURRENCY}
              {currentBalance.toLocaleString()}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
              Projected New Balance
            </span>
            <span className="text-xl font-black text-gray-900 dark:text-white">
              {STORE_CONFIG.STORE_CURRENCY}
              {calculatedNewBalance.toLocaleString()}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300 font-medium">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Type Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
            Adjustment Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setAdjustmentMode('credit')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                adjustmentMode === 'credit'
                  ? 'bg-[#16a34a] text-white border-[#16a34a] shadow-xs'
                  : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Credit (+)</span>
            </button>
            <button
              type="button"
              onClick={() => setAdjustmentMode('debit')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                adjustmentMode === 'debit'
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Debit (-)</span>
            </button>
            <button
              type="button"
              onClick={() => setAdjustmentMode('set_direct')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                adjustmentMode === 'set_direct'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Override</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {adjustmentMode !== 'set_direct' ? (
            <>
              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
                  Amount to {adjustmentMode === 'credit' ? 'Add' : 'Deduct'} (ZAR {STORE_CONFIG.STORE_CURRENCY})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                    {STORE_CONFIG.STORE_CURRENCY}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="5"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] outline-none"
                    placeholder="50"
                    required
                  />
                </div>
                {/* Quick Presets */}
                <div className="flex items-center gap-2 pt-1">
                  {['25', '50', '100', '200', '500'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdjustmentAmount(preset)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      +{STORE_CONFIG.STORE_CURRENCY}{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Administrative Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
                  Reason for Adjustment <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Campaign bonus credit approved by management"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-gray-900 dark:text-white focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] outline-none"
                  required
                />
                {/* Reason Presets */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Quick Preset Reasons:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {presetReasons.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setReason(p)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:text-gray-900 hover:bg-gray-200 transition-colors truncate max-w-full text-left"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Direct Overrides */}
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-200 dark:border-slate-700">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 block mb-1">
                    Set Available Referral Balance ({STORE_CONFIG.STORE_CURRENCY})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={directBalance}
                    onChange={(e) => setDirectBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 block mb-1">
                    Set Total Lifetime Earned ({STORE_CONFIG.STORE_CURRENCY})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={directTotalEarned}
                    onChange={(e) => setDirectTotalEarned(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 block mb-1">
                    Set Successful Conversions Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={directCount}
                    onChange={(e) => setDirectCount(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 block mb-1">
                    Audit Note
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for manual override"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-[#16a34a] hover:bg-[#15803d] shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Apply Balance Change</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
