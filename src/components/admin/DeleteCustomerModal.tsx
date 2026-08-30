import React, { useState } from 'react';
import { X, AlertTriangle, Trash2, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import { Customer } from '../../types';
import { STORE_CONFIG } from '../../constants/config';

interface DeleteCustomerModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export const DeleteCustomerModal: React.FC<DeleteCustomerModalProps> = ({
  isOpen,
  customer,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [confirmationInput, setConfirmationInput] = useState<string>('');
  const [understoodCompliance, setUnderstoodCompliance] = useState<boolean>(false);

  if (!isOpen || !customer) return null;

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
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-red-100 dark:border-red-950/80 space-y-6 relative"
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

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                Permanently Delete Customer Account
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Customer: <span className="font-bold text-gray-800 dark:text-slate-200">{customer.fullName || 'User'}</span> ({customer.email})
            </p>
          </div>
        </div>

        {/* Warning Callout Box */}
        <div className="p-4 rounded-2xl bg-red-50/90 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-950 dark:text-red-200 text-xs space-y-2.5">
          <div className="flex items-center gap-2 font-black text-red-700 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Warning: Permanent Deletion</span>
          </div>
          <p className="text-[11px] leading-relaxed text-red-900/90 dark:text-red-200">
            This action permanently erases the customer profile, saved favorites, referral credentials, and personal data from the database. This operation cannot be undone.
          </p>
        </div>

        {/* Legal & Compliance Safeguard Notice */}
        <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-950 dark:text-blue-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-blue-800 dark:text-blue-300">
            <FileText className="w-4 h-4 shrink-0" />
            <span>Financial &amp; Legal Compliance Records</span>
          </div>
          <p className="text-[11px] leading-relaxed text-blue-900/90 dark:text-blue-200">
            To comply with South African tax, accounting, and consumer legislation (SARS VAT records &amp; CPA), <strong>all past invoices, transactions, and completed order entries ({customer.orderCount} total orders, {STORE_CONFIG.STORE_CURRENCY}{customer.totalSpent.toLocaleString()} spend)</strong> will remain intact in store records with the customer's personal identity safely anonymized.
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
              I understand that personal profile data will be permanently deleted and order transaction records preserved for compliance.
            </span>
          </label>

          {/* Type DELETE to confirm */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
              Type <span className="font-mono font-black text-red-600 dark:text-red-400">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-white uppercase tracking-wider focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-red-500"
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
              disabled={!isConfirmed || isLoading}
              className={`px-5 py-2.5 rounded-xl text-xs font-black text-white transition-all shadow-sm flex items-center gap-2 ${
                isConfirmed && !isLoading
                  ? 'bg-red-600 hover:bg-red-700 active:scale-95 cursor-pointer'
                  : 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>{isLoading ? 'Deleting Customer...' : 'Permanently Delete Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
