import React, { useState } from 'react';
import {
  X,
  History,
  Clock,
  Send,
  Mail,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileDown,
  ArrowRight,
  User,
  Sliders,
  Download,
  Filter,
  Search,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Invoice, InvoiceAuditEvent, InvoiceAuditEventType } from '../../types';
import { formatCurrency } from '../../utils/taxUtils';

interface InvoiceAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onResend?: (invoice: Invoice) => void;
  onDownloadPDF?: (invoice: Invoice) => void;
}

export const InvoiceAuditLogModal: React.FC<InvoiceAuditLogModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onResend,
  onDownloadPDF,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'status' | 'sending' | 'payment'>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  if (!isOpen || !invoice) return null;

  const allLogs: InvoiceAuditEvent[] = invoice.audit_logs && invoice.audit_logs.length > 0
    ? invoice.audit_logs
    : [];

  const filteredLogs = allLogs.filter((log) => {
    // Category filter
    if (selectedFilter === 'status' && log.type !== 'status_changed') return false;
    if (selectedFilter === 'sending' && !['auto_sent', 'manual_sent', 'manual_resent'].includes(log.type)) return false;
    if (selectedFilter === 'payment' && !['payment_updated', 'created', 'reconciled'].includes(log.type)) return false;

    // Text search
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      return (
        log.title.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.actor.toLowerCase().includes(q) ||
        (log.metadata?.recipientEmail && log.metadata.recipientEmail.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getEventBadge = (type: InvoiceAuditEventType) => {
    switch (type) {
      case 'created':
        return {
          icon: Sparkles,
          bg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          dot: 'bg-indigo-500',
          label: 'Creation',
        };
      case 'auto_sent':
        return {
          icon: Send,
          bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          dot: 'bg-emerald-500',
          label: 'Automated Dispatch',
        };
      case 'manual_sent':
      case 'manual_resent':
        return {
          icon: Mail,
          bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          dot: 'bg-blue-500',
          label: type === 'manual_resent' ? 'Manual Resend' : 'Manual Dispatch',
        };
      case 'status_changed':
        return {
          icon: Sliders,
          bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          dot: 'bg-amber-500',
          label: 'Status Change',
        };
      case 'payment_updated':
        return {
          icon: CheckCircle2,
          bg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
          dot: 'bg-teal-500',
          label: 'Payment Verified',
        };
      case 'pdf_downloaded':
        return {
          icon: FileDown,
          bg: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700',
          dot: 'bg-gray-500',
          label: 'PDF Export',
        };
      case 'bulk_action':
        return {
          icon: Layers,
          bg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          dot: 'bg-purple-500',
          label: 'Bulk Action',
        };
      default:
        return {
          icon: Clock,
          bg: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700',
          dot: 'bg-gray-400',
          label: 'Audit Event',
        };
    }
  };

  const handleExportAuditCSV = () => {
    const headers = ['Timestamp', 'Event Type', 'Actor', 'Title', 'Details', 'Recipient', 'Previous Status', 'New Status'];
    const rows = allLogs.map((log) => [
      new Date(log.timestamp).toISOString(),
      log.type,
      `"${log.actor}"`,
      `"${log.title}"`,
      `"${log.details.replace(/"/g, '""')}"`,
      log.metadata?.recipientEmail || '',
      log.metadata?.previousStatus || '',
      log.metadata?.newStatus || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Audit_Trail_${invoice.invoice_number}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:px-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/80 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-2xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-gray-900 dark:text-white text-base">
                  Audit Log & Traceability Trail
                </h3>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  #{invoice.invoice_number}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Complete verifiable chronological timeline of all lifecycle events and dispatches
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAuditCSV}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Export audit events to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Log</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Key Summary Card */}
        <div className="p-4 sm:p-5 bg-gray-50/60 dark:bg-slate-800/40 border-b border-gray-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-gray-400 dark:text-slate-500 font-bold block text-[10px] uppercase">Customer</span>
            <span className="font-extrabold text-gray-900 dark:text-white truncate block">{invoice.customer_name}</span>
            <span className="text-[11px] text-gray-400 dark:text-slate-500 truncate block">{invoice.customer_email}</span>
          </div>

          <div>
            <span className="text-gray-400 dark:text-slate-500 font-bold block text-[10px] uppercase">Financial Total</span>
            <span className="font-black text-gray-900 dark:text-white text-sm">{formatCurrency(invoice.total_amount)}</span>
            <span className="text-[10px] text-gray-400 block">incl. 15% VAT ({formatCurrency(invoice.vat_amount)})</span>
          </div>

          <div>
            <span className="text-gray-400 dark:text-slate-500 font-bold block text-[10px] uppercase">Current Status</span>
            <span className="font-black text-[#ff6452] block mt-0.5">{invoice.status.toUpperCase()}</span>
            <span className="text-[10px] text-gray-400 block">Pay: {invoice.payment_status || 'Pending'}</span>
          </div>

          <div>
            <span className="text-gray-400 dark:text-slate-500 font-bold block text-[10px] uppercase">Dispatch Stats</span>
            <span className="font-extrabold text-blue-600 dark:text-blue-400 block">
              {invoice.sent_count || 0} times dispatched
            </span>
            {invoice.last_sent_at && (
              <span className="text-[10px] text-gray-400 block truncate">
                Last: {new Date(invoice.last_sent_at).toLocaleDateString('en-ZA')}
              </span>
            )}
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="p-3 sm:px-6 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: `All Events (${allLogs.length})` },
              { id: 'status', label: 'Status Changes' },
              { id: 'sending', label: 'Email Dispatches' },
              { id: 'payment', label: 'Payments & Creation' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedFilter === f.id
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-2xs'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search audit details..."
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-1 focus:ring-[#ff6452] outline-none"
            />
          </div>
        </div>

        {/* Chronological Audit Event Timeline */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 px-4 bg-gray-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
              <History className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-700 dark:text-slate-300">No audit events match your filter</p>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                Try selecting "All Events" or clearing your search term.
              </p>
            </div>
          ) : (
            <div className="relative pl-4 sm:pl-6 space-y-6 before:absolute before:left-2 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-slate-800">
              {filteredLogs.map((log) => {
                const dateObj = new Date(log.timestamp);
                const badge = getEventBadge(log.type);
                const Icon = badge.icon;

                return (
                  <div key={log.id} className="relative pl-6 group">
                    {/* Node Icon on vertical line */}
                    <div
                      className={`absolute -left-4 sm:-left-3 top-0.5 w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-xs ${badge.bg}`}
                    >
                      <Icon className="w-3 h-3" />
                    </div>

                    {/* Event Content Card */}
                    <div className="bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 transition-all space-y-2 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                          <span className="font-extrabold text-gray-900 dark:text-white text-xs">
                            {log.title}
                          </span>
                        </div>

                        <div className="text-[11px] text-gray-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {dateObj.toLocaleDateString('en-ZA')} at{' '}
                            {dateObj.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <p className="text-gray-700 dark:text-slate-300 leading-relaxed font-medium">
                        {log.details}
                      </p>

                      {/* Metadata Chips / Details */}
                      <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px]">
                        <div className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 font-medium">
                          Actor: <strong className="text-gray-900 dark:text-white">{log.actor}</strong>
                        </div>

                        {log.metadata?.recipientEmail && (
                          <div className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400">
                            Recipient: <strong className="text-gray-900 dark:text-white">{log.metadata.recipientEmail}</strong>
                          </div>
                        )}

                        {log.metadata?.previousStatus && log.metadata?.newStatus && (
                          <div className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 flex items-center gap-1">
                            <span className="line-through text-gray-400">{log.metadata.previousStatus}</span>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span className="font-extrabold text-[#ff6452]">{log.metadata.newStatus}</span>
                          </div>
                        )}

                        {log.metadata?.notes && (
                          <div className="w-full text-[11px] italic bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-gray-100 dark:border-slate-800 text-gray-500 dark:text-slate-400">
                            Note: "{log.metadata.notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/80 flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
            Showing {filteredLogs.length} audit trail record(s)
          </span>

          <div className="flex items-center gap-2">
            {onDownloadPDF && (
              <button
                onClick={() => onDownloadPDF(invoice)}
                className="px-3.5 py-2 rounded-xl bg-gray-900 dark:bg-slate-800 hover:bg-black text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-[#ff6452]" />
                <span>Download PDF</span>
              </button>
            )}

            {onResend && (
              <button
                onClick={() => onResend(invoice)}
                className="px-3.5 py-2 rounded-xl bg-[#ff6452] hover:bg-[#ff523d] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Resend Invoice</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
