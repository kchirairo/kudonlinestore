import React, { useState } from 'react';
import {
  X,
  Clock,
  Send,
  Mail,
  CheckCircle2,
  AlertCircle,
  History,
  User,
  ShieldCheck,
  Calendar,
  Sparkles,
  Sliders,
  FileDown,
  ArrowRight,
  Maximize2,
} from 'lucide-react';
import { Invoice, InvoiceAuditEvent, InvoiceAuditEventType } from '../../types';
import { formatCurrency } from '../../utils/taxUtils';

interface InvoiceHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onResend?: (invoice: Invoice) => void;
  onDownloadPDF?: (invoice: Invoice) => void;
  onOpenFullAuditModal?: (invoice: Invoice) => void;
}

export const InvoiceHistoryDrawer: React.FC<InvoiceHistoryDrawerProps> = ({
  isOpen,
  onClose,
  invoice,
  onResend,
  onDownloadPDF,
  onOpenFullAuditModal,
}) => {
  const [activeTab, setActiveTab] = useState<'all_audit' | 'email_dispatches'>('all_audit');

  if (!isOpen || !invoice) return null;

  const sendingHistory = invoice.sending_history || [];
  const auditLogs: InvoiceAuditEvent[] = invoice.audit_logs && invoice.audit_logs.length > 0
    ? invoice.audit_logs
    : [];

  const getEventBadge = (type: InvoiceAuditEventType) => {
    switch (type) {
      case 'created':
        return {
          icon: Sparkles,
          bg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
          dot: 'border-indigo-500',
          label: 'Invoice Created',
        };
      case 'auto_sent':
        return {
          icon: Send,
          bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
          dot: 'border-emerald-500',
          label: 'Auto Dispatched',
        };
      case 'manual_sent':
      case 'manual_resent':
        return {
          icon: Mail,
          bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
          dot: 'border-blue-500',
          label: type === 'manual_resent' ? 'Manual Resend' : 'Manual Dispatch',
        };
      case 'status_changed':
        return {
          icon: Sliders,
          bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
          dot: 'border-amber-500',
          label: 'Status Updated',
        };
      case 'payment_updated':
        return {
          icon: CheckCircle2,
          bg: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
          dot: 'border-teal-500',
          label: 'Payment Verified',
        };
      case 'pdf_downloaded':
        return {
          icon: FileDown,
          bg: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
          dot: 'border-gray-500',
          label: 'PDF Exported',
        };
      default:
        return {
          icon: Clock,
          bg: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
          dot: 'border-gray-400',
          label: 'Audit Entry',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-gray-100 dark:border-slate-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white">
                Invoice Audit Trail
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Invoice #{invoice.invoice_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onOpenFullAuditModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenFullAuditModal(invoice);
                }}
                className="p-1.5 rounded-xl text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                title="Expand to Full View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Summary Card */}
        <div className="p-4 mx-5 mt-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-slate-400">Customer:</span>
            <span className="font-bold text-gray-900 dark:text-white truncate max-w-[180px]">{invoice.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-slate-400">Email:</span>
            <span className="font-bold text-gray-900 dark:text-white truncate max-w-[180px]">{invoice.customer_email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-slate-400">Grand Total:</span>
            <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.total_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-slate-400">Dispatch Count:</span>
            <span className="font-extrabold text-[#ff6452]">{invoice.sent_count || sendingHistory.length} time(s)</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="px-5 pt-3 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('all_audit')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'all_audit'
                ? 'text-[#ff6452] border-b-2 border-[#ff6452]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            All Audit Events ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('email_dispatches')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'email_dispatches'
                ? 'text-[#ff6452] border-b-2 border-[#ff6452]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Email Logs ({sendingHistory.length})
          </button>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'all_audit' ? (
            auditLogs.length === 0 ? (
              <div className="text-center py-10 px-4 bg-gray-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
                <History className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-600 dark:text-slate-400">No audit events recorded yet</p>
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-slate-800">
                {auditLogs.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  const badge = getEventBadge(log.type);
                  return (
                    <div key={log.id} className="relative pl-7 group">
                      <div
                        className={`absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-slate-900 ${badge.dot}`}
                      />
                      <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 transition-colors text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${badge.bg}`}>
                            {badge.label}
                          </span>
                          <span className="text-[11px] text-gray-400 dark:text-slate-500 font-medium">
                            {dateObj.toLocaleDateString('en-ZA')} {dateObj.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="font-extrabold text-gray-900 dark:text-white">
                          {log.title}
                        </div>

                        <p className="text-[11px] text-gray-600 dark:text-slate-300">
                          {log.details}
                        </p>

                        <div className="text-[10px] text-gray-400 dark:text-slate-500 pt-1 flex items-center justify-between">
                          <span>Actor: <strong className="text-gray-700 dark:text-slate-300">{log.actor}</strong></span>
                          {log.metadata?.newStatus && (
                            <span className="text-[#ff6452] font-bold">Status: {log.metadata.newStatus}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            sendingHistory.length === 0 ? (
              <div className="text-center py-10 px-4 bg-gray-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
                <Mail className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-600 dark:text-slate-400">No email dispatches recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3 relative before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200 dark:before:bg-slate-800">
                {sendingHistory.map((log, index) => {
                  const dateObj = new Date(log.timestamp);
                  const isAuto = log.triggerType === 'auto';
                  return (
                    <div key={log.id || index} className="relative pl-7 group">
                      <div
                        className={`absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-slate-900 ${
                          log.status === 'failed'
                            ? 'border-rose-500'
                            : isAuto
                            ? 'border-emerald-500'
                            : 'border-blue-500'
                        }`}
                      />
                      <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 transition-colors text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                              isAuto
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {isAuto ? '⚡ Auto-Sent on Paid' : '👤 Manual Admin Dispatch'}
                          </span>
                          <span className="text-[11px] text-gray-400 dark:text-slate-500 font-medium">
                            {dateObj.toLocaleDateString('en-ZA')} {dateObj.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="text-gray-800 dark:text-slate-200 font-medium">
                          Sent to: <span className="font-bold text-gray-900 dark:text-white">{log.sentTo}</span>
                        </div>

                        {log.sentBy && (
                          <div className="text-gray-500 dark:text-slate-400 text-[11px]">
                            Sender: <span className="text-gray-700 dark:text-slate-300">{log.sentBy}</span>
                          </div>
                        )}

                        {log.notes && (
                          <div className="text-[11px] text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-gray-100 dark:border-slate-800 mt-1 italic">
                            "{log.notes}"
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 pt-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Dispatched successfully via Email Provider</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer text-center"
          >
            Close
          </button>
          {onDownloadPDF && (
            <button
              type="button"
              onClick={() => onDownloadPDF(invoice)}
              className="flex-1 py-2.5 rounded-xl bg-gray-900 dark:bg-slate-800 hover:bg-black text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-[#ff6452]" />
              <span>Download PDF</span>
            </button>
          )}
          {onResend && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onResend(invoice);
              }}
              className="flex-1 py-2.5 rounded-xl bg-[#ff6452] hover:bg-[#ff523d] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Resend</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
