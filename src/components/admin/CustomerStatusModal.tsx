import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, PauseCircle, Ban, CheckCircle2, ShieldCheck, Info } from 'lucide-react';
import { Customer, CustomerAccountStatus } from '../../types';

interface CustomerStatusModalProps {
  isOpen: boolean;
  customer: Customer | null;
  initialStatus?: CustomerAccountStatus;
  onClose: () => void;
  onConfirm: (status: CustomerAccountStatus, reason: string) => Promise<void>;
  isLoading?: boolean;
}

const PRESET_REASONS: Record<CustomerAccountStatus, string[]> = {
  on_hold: [
    'Account temporarily placed on hold for address/identity verification',
    'Payment verification in progress',
    'Temporary hold requested by customer',
    'Under review for unconfirmed order activity',
  ],
  disabled: [
    'Account disabled due to fraudulent payment dispute / chargeback',
    'Repeated policy or terms of service violation',
    'Multiple failed delivery attempts / unreachable contact',
    'Account suspended by store security administration',
  ],
  active: [
    'Account verified and restored to active standing',
    'Manual administrative reactivation',
  ],
};

export const CustomerStatusModal: React.FC<CustomerStatusModalProps> = ({
  isOpen,
  customer,
  initialStatus = 'on_hold',
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<CustomerAccountStatus>(initialStatus);
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    if (customer) {
      const defaultStatus = initialStatus || customer.accountStatus || 'on_hold';
      setSelectedStatus(defaultStatus);
      setReason(customer.disabledReason || PRESET_REASONS[defaultStatus]?.[0] || '');
    }
  }, [customer, initialStatus, isOpen]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(selectedStatus, reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              selectedStatus === 'disabled'
                ? 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400'
                : selectedStatus === 'on_hold'
                ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
            }`}
          >
            {selectedStatus === 'disabled' ? (
              <Ban className="w-6 h-6" />
            ) : selectedStatus === 'on_hold' ? (
              <PauseCircle className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              {selectedStatus === 'active'
                ? 'Reactivate Customer Account'
                : selectedStatus === 'on_hold'
                ? 'Place Customer Account on Hold'
                : 'Disable Customer Account'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Customer: <span className="font-bold text-gray-800 dark:text-slate-200">{customer.fullName || 'User'}</span> ({customer.email})
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Status Selection Cards */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-500 dark:text-slate-400 tracking-wider">
              Target Account Status
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Active */}
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus('active');
                  setReason(PRESET_REASONS.active[0]);
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col items-center sm:items-start gap-1.5 transition-all cursor-pointer ${
                  selectedStatus === 'active'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Active</span>
                </div>
                <span className="text-[10px] text-gray-500 dark:text-slate-400 hidden sm:inline">
                  Full store privileges
                </span>
              </button>

              {/* On Hold */}
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus('on_hold');
                  setReason(PRESET_REASONS.on_hold[0]);
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col items-center sm:items-start gap-1.5 transition-all cursor-pointer ${
                  selectedStatus === 'on_hold'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-xs'
                    : 'border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs text-amber-600 dark:text-amber-400">
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>On Hold</span>
                </div>
                <span className="text-[10px] text-gray-500 dark:text-slate-400 hidden sm:inline">
                  Purchases paused
                </span>
              </button>

              {/* Disabled */}
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus('disabled');
                  setReason(PRESET_REASONS.disabled[0]);
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col items-center sm:items-start gap-1.5 transition-all cursor-pointer ${
                  selectedStatus === 'disabled'
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-900 dark:text-red-200 ring-2 ring-red-500/20 shadow-xs'
                    : 'border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs text-red-600 dark:text-red-400">
                  <Ban className="w-3.5 h-3.5" />
                  <span>Disabled</span>
                </div>
                <span className="text-[10px] text-gray-500 dark:text-slate-400 hidden sm:inline">
                  Account locked
                </span>
              </button>
            </div>
          </div>

          {/* Policy Enforcement Warning Box */}
          {selectedStatus !== 'active' ? (
            <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Enforced Restrictions for this Customer:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                <li>Cannot add products to shopping cart</li>
                <li>Cannot place new orders or checkout</li>
                <li>Cannot complete new financial transactions</li>
                <li><strong>Existing order history remains safely preserved</strong></li>
              </ul>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Reactivation Privileges:</span>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                Customer will immediately regain access to cart, checkout, purchasing, and order management.
              </p>
            </div>
          )}

          {/* Reason Input & Preset Suggestions */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-500 dark:text-slate-400 tracking-wider">
              {selectedStatus === 'active' ? 'Reactivation Note (Optional)' : 'Reason / Administrative Note'}
            </label>
            
            {/* Presets */}
            {PRESET_REASONS[selectedStatus] && PRESET_REASONS[selectedStatus].length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {PRESET_REASONS[selectedStatus].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReason(preset)}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-left"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}

            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for account status change..."
              className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-[#ff6452]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-5 py-2.5 rounded-xl text-xs font-black text-white transition-all shadow-sm flex items-center gap-1.5 ${
                selectedStatus === 'disabled'
                  ? 'bg-red-600 hover:bg-red-700 active:scale-95'
                  : selectedStatus === 'on_hold'
                  ? 'bg-amber-600 hover:bg-amber-700 active:scale-95'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                'Updating Status...'
              ) : selectedStatus === 'active' ? (
                'Reactivate Account'
              ) : selectedStatus === 'on_hold' ? (
                'Place on Hold'
              ) : (
                'Disable Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
