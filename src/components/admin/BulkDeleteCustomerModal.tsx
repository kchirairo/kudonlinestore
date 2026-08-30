import React, { useState } from 'react';
import { X, AlertTriangle, Trash2, ShieldCheck, FileText, CheckCircle2, Users } from 'lucide-react';
import { Customer } from '../../types';
import { STORE_CONFIG } from '../../constants/config';

interface BulkDeleteCustomerModalProps {
  isOpen: boolean;
  customers: Customer[];
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export const BulkDeleteCustomerModal: React.FC<BulkDeleteCustomerModalProps> = ({
  isOpen,
  customers,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [confirmationInput, setConfirmationInput] = useState<string>('');
  const [understoodCompliance, setUnderstoodCompliance] = useState<boolean>(false);

  if (!isOpen || customers.length === 0) return null;

  const totalOrders = customers.reduce((sum, c) => sum + (c.orderCount || 0), 0);
  const totalSpend = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);

  const isConfirmed =
    confirmationInput.trim().toUpperCase() === 'DELETE' && understoodCompliance;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-red-100 dark:border-red-950/80 space-y-6 relative max-h-[90vh] overflow-y-auto"
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
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>

          <div className="space-y-1 pr-6">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              Permanently Delete {customers.length} Customer Accounts
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Selected: <span className="font-bold text-gray-800 dark:text-slate-200">{customers.length} customer profiles</span>
            </p>
          </div>
        </div>

        {/* Selected Customer List Preview */}
        <div className="p-3 bg-red-50/50 dark:bg-red-950/30 rounded-2xl border border-red-100 dark:border-red-900/40 max-h-32 overflow-y-auto space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-800 dark:text-red-300">
            <Users className="w-3.5 h-3.5" />
            <span>Accounts to be deleted ({customers.length}):</span>
          </div>
          <div className="divide-y divide-red-100 dark:divide-red-900/30">
            {customers.map((c) => (
              <div key={c.id} className="py-1 text-[11px] flex items-center justify-between text-gray-700 dark:text-slate-300">
                <span className="font-semibold">{c.fullName || 'User'}</span>
                <span className="font-mono text-gray-500 text-[10px]">{c.email}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Warning Callout Box */}
        <div className="p-4 rounded-2xl bg-red-50/90 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-950 dark:text-red-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-black text-red-700 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Irreversible Batch Action</span>
          </div>
          <p className="text-[11px] leading-relaxed text-red-900/90 dark:text-red-200">
            This operation will permanently purge {customers.length} customer records, authentication linkages, saved favourites, and referral tokens from the database.
          </p>
        </div>

        {/* Legal & Compliance Safeguard Notice */}
        <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-950 dark:text-blue-200 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-blue-800 dark:text-blue-300">
            <FileText className="w-4 h-4 shrink-0" />
            <span>Financial &amp; Legal Compliance Records</span>
          </div>
          <p className="text-[11px] leading-relaxed text-blue-900/90 dark:text-blue-200">
            For statutory tax and audit requirements, all associated past transaction receipts (<strong>{totalOrders} total orders, {STORE_CONFIG.STORE_CURRENCY}{totalSpend.toLocaleString()} spend</strong>) will remain archived in store financial logs with user identity safely anonymized.
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Checkbox Acknowledgment */}
          <label className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={understoodCompliance}
              onChange={(e) => setUnderstoodCompliance(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500 border-gray-300"
            />
            <span className="text-xs text-gray-700 dark:text-slate-300 font-medium">
              I confirm that I understand this will permanently delete all {customers.length} customer profiles and cannot be reversed.
            </span>
          </label>

          {/* Type Confirmation Keyword */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
              Type <span className="font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-1.5 py-0.5 rounded">DELETE</span> to authorize batch removal
            </label>
            <input
              type="text"
              placeholder="DELETE"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-gray-900 dark:text-white uppercase tracking-wider focus:outline-none focus:border-red-500"
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
              disabled={!isConfirmed || isLoading}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-red-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              {isLoading ? (
                <span>Deleting {customers.length} Accounts...</span>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Permanently Delete {customers.length} Customers</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
