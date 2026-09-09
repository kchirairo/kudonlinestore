import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  User,
  History,
  ShieldCheck,
} from 'lucide-react';
import { Invoice } from '../../types';
import { formatCurrency } from '../../utils/taxUtils';

interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSend: (
    invoice: Invoice,
    recipientEmail: string,
    customMessage: string,
    senderName: string
  ) => Promise<{ success: boolean; message: string }>;
}

export const SendInvoiceModal: React.FC<SendInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSend,
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [senderName, setSenderName] = useState('KUD Store Billing Admin');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (invoice) {
      setRecipientEmail(invoice.customer_email || '');
      setCustomMessage(
        `Dear ${invoice.customer_name},\n\nPlease find attached your official Tax Invoice #${invoice.invoice_number} for Order #${invoice.order_number} (${formatCurrency(invoice.total_amount)}).\n\nThank you for shopping with us!`
      );
      setErrorMessage(null);
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setErrorMessage('Please provide a valid recipient email address.');
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const result = await onSend(invoice, recipientEmail, customMessage, senderName);
      if (result.success) {
        onClose();
      } else {
        setErrorMessage(result.message || 'Failed to dispatch invoice email.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while dispatching email.');
    } finally {
      setIsSending(false);
    }
  };

  const isResend = (invoice.sent_count || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ff6452] flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white">
                {isResend ? 'Resend Tax Invoice / Receipt' : 'Send Customer Tax Invoice'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Invoice #{invoice.invoice_number} • Order #{invoice.order_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isResend && (
          <div className="mt-4 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2">
            <History className="w-4 h-4 shrink-0" />
            <span>
              This invoice was previously dispatched <strong>{invoice.sent_count} time(s)</strong>. Last sent:{' '}
              {invoice.last_sent_at ? new Date(invoice.last_sent_at).toLocaleString() : 'N/A'}.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
              Recipient Customer Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[#ff6452]/20 focus:border-[#ff6452] outline-none"
              />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
              Registered customer: <strong className="text-gray-600 dark:text-slate-400">{invoice.customer_name}</strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
              Sender Name / Department
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[#ff6452]/20 focus:border-[#ff6452] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
              Accompanying Message / Notes
            </label>
            <textarea
              rows={4}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[#ff6452]/20 focus:border-[#ff6452] outline-none leading-relaxed"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 space-y-1 text-xs">
            <div className="flex justify-between text-gray-500 dark:text-slate-400">
              <span>Invoice Amount:</span>
              <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.total_amount)}</span>
            </div>
            {invoice.vat_amount > 0 && (
              <div className="flex justify-between text-gray-500 dark:text-slate-400">
                <span>Tax / VAT Portion:</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.vat_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500 dark:text-slate-400">
              <span>Payment Status:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{invoice.payment_status}</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2.5 rounded-xl bg-[#ff6452] hover:bg-[#ff523d] text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Dispatching Email...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{isResend ? 'Resend Tax Invoice' : 'Send Tax Invoice'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
