import React, { useState, useEffect } from 'react';
import { X, PauseCircle, Ban, ShieldCheck, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import { Customer, CustomerAccountStatus } from '../../types';

interface BulkCustomerStatusModalProps {
  isOpen: boolean;
  customers: Customer[];
  initialStatus?: CustomerAccountStatus;
  onClose: () => void;
  onConfirm: (status: CustomerAccountStatus, reason: string) => Promise<void>;
  isLoading?: boolean;
}

const PRESET_REASONS: Record<CustomerAccountStatus, string[]> = {
  on_hold: [
    'Bulk administrative verification hold',
    'Payment verification in progress for selected cohort',
    'Temporary account security review',
    'Pending customer contact confirmation',
  ],
  disabled: [
    'Bulk policy compliance suspension',
    'Suspicious or fraudulent activity detected',
    'Multiple failed delivery addresses / invalid contact profiles',
    'Account privileges disabled by Store Administration',
  ],
  active: [
    'Restored full purchasing and ordering privileges',
    'Administrative batch reactivation',
    'Verification completed successfully',
  ],
};

export const BulkCustomerStatusModal: React.FC<BulkCustomerStatusModalProps> = ({
  isOpen,
  customers,
  initialStatus = 'on_hold',
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<CustomerAccountStatus>(initialStatus);
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(initialStatus);
      setReason(PRESET_REASONS[initialStatus]?.[0] || '');
    }
  }, [initialStatus, isOpen]);

  if (!isOpen || customers.length === 0) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(selectedStatus, reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-6 relative max-h-[90vh] overflow-y-auto"
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

        {/* Header */}
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

          <div className="space-y-1 pr-6">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              {selectedStatus === 'active'
                ? `Reactivate ${customers.length} Accounts`
                : selectedStatus === 'on_hold'
                ? `Place ${customers.length} Accounts on Hold`
                : `Disable ${customers.length} Accounts`}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Applying status update to <span className="font-bold text-gray-800 dark:text-slate-200">{customers.length} selected customer{customers.length > 1 ? 's' : ''}</span>.
            </p>
          </div>
        </div>

        {/* Selected Customers Preview Chips */}
        <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700/60 max-h-28 overflow-y-auto space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-slate-400">
            <Users className="w-3.5 h-3.5" />
            <span>Target Customers ({customers.length}):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {customers.slice(0, 10).map((c) => (
              <span
                key={c.id}
                className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 text-[11px] font-semibold border border-gray-200 dark:border-slate-600 shadow-2xs"
              >
                {c.fullName || c.email}
              </span>
            ))}
            {customers.length > 10 && (
              <span className="px-2 py-0.5 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 text-[11px] font-bold">
                +{customers.length - 10} more
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Target Status Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              New Account Status
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Active */}
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus('active');
                  setReason(PRESET_REASONS.active[0]);
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  selectedStatus === 'active'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-gray-700 dark:text-slate-300'
                }`}
              >
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-black">Active</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-400 leading-tight">
                  Full buying privileges
                </span>
              </button>

              {/* On Hold */}
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus('on_hold');
                  setReason(PRESET_REASONS.on_hold[0]);
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  selectedStatus === 'on_hold'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-gray-700 dark:text-slate-300'
                }`}
              >
                <PauseCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-black">On Hold</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-400 leading-tight">
                  Pause buying
                </span>
              </button>

              {/* Disabled */}
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus('disabled');
                  setReason(PRESET_REASONS.disabled[0]);
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  selectedStatus === 'disabled'
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-950/40 text-red-900 dark:text-red-200 ring-2 ring-red-500/20'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-gray-700 dark:text-slate-300'
                }`}
              >
                <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-xs font-black">Disabled</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-400 leading-tight">
                  Restrict access
                </span>
              </button>
            </div>
          </div>

          {/* Quick Preset Reasons */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-300">
              Select Preset Administrative Note
            </label>
            <div className="space-y-1">
              {(PRESET_REASONS[selectedStatus] || []).map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-between ${
                    reason === preset
                      ? 'bg-[#16a34a]/10 text-[#16a34a] font-bold dark:bg-[#16a34a]/20'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400'
                  }`}
                >
                  <span className="truncate pr-2">{preset}</span>
                  {reason === preset && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Reason Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-300">
              Administrative Reason / Note
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for this batch status update..."
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#16a34a]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                selectedStatus === 'disabled'
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                  : selectedStatus === 'on_hold'
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
              }`}
            >
              {isLoading ? (
                <span>Updating {customers.length} Accounts...</span>
              ) : selectedStatus === 'active' ? (
                <span>Confirm Batch Reactivation</span>
              ) : selectedStatus === 'on_hold' ? (
                <span>Confirm Batch Hold</span>
              ) : (
                <span>Confirm Batch Disable</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
