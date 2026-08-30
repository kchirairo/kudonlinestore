import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Search,
  Filter,
  FileDown,
  Mail,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Sliders,
  History,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Download,
  ToggleLeft,
  ToggleRight,
  MoreVertical,
  Calendar,
  DollarSign,
  ChevronDown,
  ArrowUpDown,
  CheckSquare,
  Square,
  MinusSquare,
  Layers,
  X,
  Printer,
  Sparkles,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { adminService } from '../../services/adminService';
import {
  Invoice,
  InvoiceStatus,
  InvoiceSettingsConfig,
  PaymentStatus,
} from '../../types';
import { formatCurrency } from '../../utils/taxUtils';
import { generateOrderInvoicePDF } from '../../utils/invoiceGenerator';
import { InvoicePreviewModal } from '../../components/admin/InvoicePreviewModal';
import { SendInvoiceModal } from '../../components/admin/SendInvoiceModal';
import { InvoiceHistoryDrawer } from '../../components/admin/InvoiceHistoryDrawer';
import { InvoiceAuditLogModal } from '../../components/admin/InvoiceAuditLogModal';
import { DEFAULT_INVOICE_SETTINGS } from '../../constants/config';

export const AdminInvoicesPage: React.FC = () => {
  const { showToast } = useShop();

  // Data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [settings, setSettings] = useState<InvoiceSettingsConfig>(DEFAULT_INVOICE_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | 'All'>('All');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus | 'All'>('All');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | 'today' | '7d' | '30d' | 'month'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Selection states for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkResending, setIsBulkResending] = useState<boolean>(false);
  const [isBulkExporting, setIsBulkExporting] = useState<boolean>(false);
  const [showBulkResendModal, setShowBulkResendModal] = useState<boolean>(false);
  const [bulkResendMessage, setBulkResendMessage] = useState<string>('');

  // Modals and Drawers state
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [sendInvoiceTarget, setSendInvoiceTarget] = useState<Invoice | null>(null);
  const [historyInvoice, setHistoryInvoice] = useState<Invoice | null>(null);
  const [auditLogInvoice, setAuditLogInvoice] = useState<Invoice | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Load Invoices & Settings
  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const [fetchedInvoices, fetchedSettings] = await Promise.all([
        adminService.getInvoices({
          search: searchQuery,
          status: selectedStatus,
          paymentStatus: selectedPaymentStatus,
          dateRange: selectedTimeframe,
          sortBy,
        }),
        adminService.getInvoiceSettings(),
      ]);

      setInvoices(fetchedInvoices);
      setSettings(fetchedSettings);
    } catch (err: any) {
      console.error('Failed to load invoices:', err);
      showToast('Error loading invoices data', 'error');
    } finally {
      if (showLoader) setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, selectedStatus, selectedPaymentStatus, selectedTimeframe, sortBy, showToast]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(false);
    showToast('Invoices refreshed', 'info');
  };

  // Toggle Auto-Send Invoices
  const handleToggleAutoSend = async () => {
    const nextState = !settings.autoSendInvoices;
    setIsSavingSettings(true);
    try {
      const res = await adminService.toggleAutoSendInvoices(nextState);
      if (res.success) {
        setSettings((prev) => ({ ...prev, autoSendInvoices: res.autoSendInvoices }));
        showToast(
          `Auto-Send Invoices ${res.autoSendInvoices ? 'ENABLED (dispatches on confirmed payment)' : 'DISABLED'}`,
          'success'
        );
      } else {
        showToast('Failed to update Auto-Send setting', 'error');
      }
    } catch {
      showToast('Failed to update Auto-Send setting', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Toggle Customer Copy
  const handleToggleCustomerCopy = async () => {
    const nextState = !settings.sendCustomerCopy;
    setIsSavingSettings(true);
    try {
      const res = await adminService.toggleCustomerCopy(nextState);
      if (res.success) {
        setSettings((prev) => ({ ...prev, sendCustomerCopy: res.sendCustomerCopy }));
        showToast(
          `Customer Email Delivery ${res.sendCustomerCopy ? 'ENABLED' : 'DISABLED'}`,
          'success'
        );
      } else {
        showToast('Failed to update customer delivery setting', 'error');
      }
    } catch {
      showToast('Failed to update customer delivery setting', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Download PDF
  const handleDownloadPDF = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    try {
      await generateOrderInvoicePDF(invoice, settings);
      
      // Log audit event for PDF generation
      await adminService.logInvoiceAuditEvent(invoice.order_id || invoice.id, {
        type: 'pdf_downloaded',
        actor: 'Admin User',
        title: 'Tax Invoice PDF Downloaded',
        details: `Official tax invoice PDF for #${invoice.invoice_number} (R${invoice.total_amount.toFixed(2)}) downloaded.`,
        metadata: {
          amount: invoice.total_amount,
          vatAmount: invoice.vat_amount,
          recipientEmail: invoice.customer_email,
        },
      });

      showToast(`Tax invoice PDF for #${invoice.invoice_number} downloaded`, 'success');
      // Update local invoice state so audit log reflects the download
      loadData(false);
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      showToast('Failed to generate PDF document', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  // Send Single Invoice
  const handleSendInvoice = async (
    invoice: Invoice,
    recipientEmail: string,
    customMessage: string,
    senderName: string
  ) => {
    const res = await adminService.sendInvoice(invoice, recipientEmail, customMessage, senderName);
    if (res.success) {
      showToast(`Invoice dispatched successfully to ${recipientEmail}`, 'success');
      loadData(false);
    }
    return res;
  };

  // Update Status directly
  const handleStatusChange = async (invoiceId: string, newStatus: InvoiceStatus) => {
    try {
      await adminService.updateInvoiceStatus(invoiceId, newStatus);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId || inv.order_id === invoiceId ? { ...inv, status: newStatus } : inv))
      );
      showToast(`Invoice status updated to ${newStatus}`, 'success');
      loadData(false);
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  // Bulk Selection Handlers
  const isAllSelected = invoices.length > 0 && selectedIds.length === invoices.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < invoices.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(invoices.map((inv) => inv.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Bulk Resend Action
  const handleConfirmBulkResend = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkResending(true);
    try {
      const res = await adminService.bulkResendInvoices(
        selectedIds,
        bulkResendMessage,
        settings.senderName || 'KUD Store Billing'
      );
      showToast(
        `Bulk dispatch completed: ${res.successCount} of ${res.total} invoices resent successfully!`,
        res.failedCount === 0 ? 'success' : 'warning'
      );
      setShowBulkResendModal(false);
      setBulkResendMessage('');
      setSelectedIds([]);
      loadData(false);
    } catch (err) {
      console.error('Bulk resend failed:', err);
      showToast('Failed to complete bulk resend operation', 'error');
    } finally {
      setIsBulkResending(false);
    }
  };

  // Bulk PDF Export
  const handleBulkExportPDF = async () => {
    if (selectedIds.length === 0) return;
    const targetInvoices = invoices.filter((inv) => selectedIds.includes(inv.id));
    setIsBulkExporting(true);
    showToast(`Generating ${targetInvoices.length} Tax Invoice PDFs in sequence...`, 'info');

    try {
      for (let i = 0; i < targetInvoices.length; i++) {
        const inv = targetInvoices[i];
        await generateOrderInvoicePDF(inv, settings);
        
        // Log individual audit event
        await adminService.logInvoiceAuditEvent(inv.order_id || inv.id, {
          type: 'pdf_downloaded',
          actor: 'Admin User (Bulk Action)',
          title: 'Tax Invoice PDF Downloaded (Batch)',
          details: `Batch PDF generation downloaded invoice #${inv.invoice_number}.`,
          metadata: {
            amount: inv.total_amount,
          },
        });

        // Small pause between sequential PDF trigger downloads
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      showToast(`Exported ${targetInvoices.length} Tax Invoice PDFs successfully!`, 'success');
      loadData(false);
    } catch (err) {
      console.error('Bulk PDF export error:', err);
      showToast('Error during bulk PDF export', 'error');
    } finally {
      setIsBulkExporting(false);
    }
  };

  // Bulk Status Update
  const handleBulkStatusUpdate = async (newStatus: InvoiceStatus) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await adminService.bulkUpdateInvoiceStatus(selectedIds, newStatus);
      showToast(
        `Updated ${res.updatedCount} invoices to status "${newStatus}"`,
        res.success ? 'success' : 'warning'
      );
      setSelectedIds([]);
      loadData(false);
    } catch (err) {
      showToast('Failed to update invoices in bulk', 'error');
    }
  };

  // Export Tax CSV Report
  const handleExportTaxCSV = () => {
    const targetInvoices = selectedIds.length > 0
      ? invoices.filter((inv) => selectedIds.includes(inv.id))
      : invoices;

    if (targetInvoices.length === 0) {
      showToast('No invoices available to export', 'warning');
      return;
    }

    const headers = [
      'Invoice Number',
      'Order Ref',
      'Issue Date',
      'Customer Name',
      'Customer Email',
      'Subtotal (Excl. VAT)',
      'VAT (15%)',
      'Grand Total (ZAR)',
      'Invoice Status',
      'Payment Status',
      'Payment Method',
      'Dispatches Count',
      'Last Sent Date',
    ];

    const rows = targetInvoices.map((inv) => [
      inv.invoice_number,
      inv.order_number,
      new Date(inv.created_at).toISOString().split('T')[0],
      `"${inv.customer_name.replace(/"/g, '""')}"`,
      inv.customer_email,
      inv.subtotal_amount.toFixed(2),
      inv.vat_amount.toFixed(2),
      inv.total_amount.toFixed(2),
      inv.status,
      inv.payment_status || 'Pending',
      inv.payment_method || 'Online',
      inv.sent_count || 0,
      inv.last_sent_at ? new Date(inv.last_sent_at).toISOString().split('T')[0] : 'Never',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SARS_Tax_Invoices_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported CSV report with ${targetInvoices.length} tax invoice records`, 'success');
  };

  // Derived Metrics
  const metrics = useMemo(() => {
    const totalCount = invoices.length;
    const paidInvoices = invoices.filter((i) => i.status === 'Paid' || i.status === 'Sent' || i.payment_status === 'Paid');
    const sentInvoices = invoices.filter((i) => (i.sent_count || 0) > 0);
    const pendingInvoices = invoices.filter((i) => i.status === 'Pending');
    const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.total_amount, 0);
    const totalVat = paidInvoices.reduce((sum, i) => sum + i.vat_amount, 0);

    return {
      totalCount,
      paidCount: paidInvoices.length,
      sentCount: sentInvoices.length,
      pendingCount: pendingInvoices.length,
      totalRevenue,
      totalVat,
      deliveryRate: totalCount > 0 ? Math.round((sentInvoices.length / totalCount) * 100) : 0,
    };
  }, [invoices]);

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>PAID</span>
          </span>
        );
      case 'Sent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Send className="w-3 h-3" />
            <span>SENT</span>
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3" />
            <span>PENDING</span>
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3 h-3" />
            <span>FAILED</span>
          </span>
        );
      case 'Refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <span>REFUNDED</span>
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700">
            <span>CANCELLED</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Invoices & Receipts Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-[#ff6452] font-black text-xs">
              SARS 15% VAT Compliant
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Track, preview, batch-dispatch, and audit official South African tax invoices and payment receipts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportTaxCSV}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Export full SARS Tax Invoice CSV report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Tax CSV</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#ff6452]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Automation Controls Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Toggle 1: Auto-Send Invoices */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                settings.autoSendInvoices
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-400'
              }`}
            >
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Auto-Send Invoices</h4>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    settings.autoSendInvoices
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                  }`}
                >
                  {settings.autoSendInvoices ? 'ACTIVE' : 'PAUSED'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Automatically generate and email customer tax invoice upon payment confirmation.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleAutoSend}
            disabled={isSavingSettings}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.autoSendInvoices ? 'bg-[#ff6452]' : 'bg-gray-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                settings.autoSendInvoices ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Toggle 2: Send Customer Email Copy */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                settings.sendCustomerCopy
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-400'
              }`}
            >
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Customer Email Delivery</h4>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    settings.sendCustomerCopy
                      ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                  }`}
                >
                  {settings.sendCustomerCopy ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Dispatch PDF attachments and SARS breakdown directly to the customer's verified email.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleCustomerCopy}
            disabled={isSavingSettings}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.sendCustomerCopy ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                settings.sendCustomerCopy ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 block mb-1">
            Total Invoices Issued
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900 dark:text-white">{metrics.totalCount}</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{metrics.paidCount} Paid</span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-2">
            Total Settled: {formatCurrency(metrics.totalRevenue)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 block mb-1">
            SARS 15% VAT Collected
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#ff6452]">{formatCurrency(metrics.totalVat)}</span>
            <span className="text-xs font-bold text-gray-500">15% Standard</span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-2">
            Section 20 VAT Act Reconciled
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 block mb-1">
            Dispatched to Customer
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{metrics.sentCount}</span>
            <span className="text-xs font-bold text-blue-600">{metrics.deliveryRate}% sent</span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-2">
            Delivered via Resend Email API
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 block mb-1">
            Pending / Awaiting Action
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{metrics.pendingCount}</span>
            <span className="text-xs font-bold text-amber-600">Awaiting pay</span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-2">
            Will auto-send once marked Paid
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice #, order ref, customer name, email, or amount..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[#ff6452]/20 focus:border-[#ff6452] outline-none"
            />
          </div>

          {/* Invoice Status Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-44">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs text-gray-900 dark:text-white font-bold outline-none cursor-pointer appearance-none pr-8"
              >
                <option value="All">All Invoice Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Sent">Sent</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
                <option value="Refunded">Refunded</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Timeframe selector */}
            <div className="relative flex-1 md:w-36">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs text-gray-900 dark:text-white font-bold outline-none cursor-pointer appearance-none pr-8"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="month">This Month</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort selector */}
            <div className="relative flex-1 md:w-36">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs text-gray-900 dark:text-white font-bold outline-none cursor-pointer appearance-none pr-8"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="amount_desc">Highest Amount</option>
                <option value="amount_asc">Lowest Amount</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-30 bg-gray-900 text-white p-3 sm:px-6 rounded-2xl shadow-xl border border-gray-800 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-[#ff6452] text-white flex items-center justify-center font-black text-xs">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold">
              {selectedIds.length} of {invoices.length} invoice(s) selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Resend Trigger */}
            <button
              onClick={() => setShowBulkResendModal(true)}
              className="px-3 py-1.5 rounded-xl bg-[#ff6452] hover:bg-[#ff4935] text-white text-xs font-black transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Bulk Resend ({selectedIds.length})</span>
            </button>

            {/* Bulk Export PDF Trigger */}
            <button
              onClick={handleBulkExportPDF}
              disabled={isBulkExporting}
              className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isBulkExporting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#ff6452]" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-[#ff6452]" />
              )}
              <span>{isBulkExporting ? 'Exporting...' : `Export PDF (${selectedIds.length})`}</span>
            </button>

            {/* Bulk Status Update Dropdown */}
            <div className="relative group">
              <button className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer">
                <span>Set Status</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block z-40 bg-gray-900 border border-gray-700 rounded-xl shadow-xl py-1 min-w-[130px] text-xs">
                {(['Paid', 'Sent', 'Pending', 'Cancelled', 'Refunded'] as InvoiceStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleBulkStatusUpdate(st)}
                    className="w-full px-3 py-1.5 text-left text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    Mark as {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Selection */}
            <button
              onClick={handleClearSelection}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
              title="Deselect All"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-[#ff6452] animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-gray-600 dark:text-slate-400">Loading tax invoices & dispatch history...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">No invoices found</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              No tax invoices match your search criteria. Invoices are generated automatically from store orders.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-slate-800/60 text-gray-500 dark:text-slate-400 font-extrabold uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                  {/* Select All Checkbox */}
                  <th className="py-4 px-3 sm:px-4 w-10 text-center">
                    <button
                      onClick={handleToggleSelectAll}
                      className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                      title={isAllSelected ? 'Deselect all' : 'Select all'}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#ff6452]" />
                      ) : isPartiallySelected ? (
                        <MinusSquare className="w-4 h-4 text-[#ff6452]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-4 px-4 sm:px-6">Invoice / Order Ref</th>
                  <th className="py-4 px-4">Customer Details</th>
                  <th className="py-4 px-4">Issue Date</th>
                  <th className="py-4 px-4 text-right">Financials (15% VAT)</th>
                  <th className="py-4 px-4 text-center">Invoice Status</th>
                  <th className="py-4 px-4 text-center">Delivery Status</th>
                  <th className="py-4 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {invoices.map((invoice) => {
                  const isSent = (invoice.sent_count || 0) > 0;
                  const isDownloading = downloadingId === invoice.id;
                  const isSelected = selectedIds.includes(invoice.id);

                  return (
                    <tr
                      key={invoice.id}
                      className={`hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Row Checkbox */}
                      <td className="py-4 px-3 sm:px-4 text-center">
                        <button
                          onClick={() => handleToggleSelect(invoice.id)}
                          className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#ff6452]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Invoice & Order Ref */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-black text-gray-900 dark:text-white text-xs flex items-center gap-1.5">
                          <span>{invoice.invoice_number}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                          Order Ref: <span className="font-semibold text-gray-600 dark:text-slate-400">{invoice.order_number}</span>
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-gray-900 dark:text-white">{invoice.customer_name}</div>
                        <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate max-w-[160px]">
                          {invoice.customer_email}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-gray-600 dark:text-slate-400 font-medium">
                        <div>{new Date(invoice.created_at).toLocaleDateString('en-ZA')}</div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(invoice.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Financial Breakdown */}
                      <td className="py-4 px-4 text-right">
                        <div className="font-black text-gray-900 dark:text-white">
                          {formatCurrency(invoice.total_amount)}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-slate-500">
                          Net: {formatCurrency(invoice.subtotal_amount)} • VAT: {formatCurrency(invoice.vat_amount)}
                        </div>
                      </td>

                      {/* Invoice Status */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-block relative group">
                          {getStatusBadge(invoice.status)}
                          {/* Quick change dropdown on hover */}
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 hidden group-hover:block z-20 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 py-1 min-w-[120px] text-left">
                            <span className="text-[9px] font-black uppercase text-gray-400 px-3 py-1 block">Set Status:</span>
                            {(['Pending', 'Paid', 'Sent', 'Failed', 'Refunded', 'Cancelled'] as InvoiceStatus[]).map((st) => (
                              <button
                                key={st}
                                onClick={() => handleStatusChange(invoice.id, st)}
                                className={`w-full px-3 py-1 text-[11px] font-bold text-left hover:bg-gray-100 dark:hover:bg-slate-700 ${
                                  invoice.status === st ? 'text-[#ff6452]' : 'text-gray-700 dark:text-slate-300'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Delivery Status */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => setHistoryInvoice(invoice)}
                          className="inline-flex items-center gap-1 text-[11px] font-extrabold cursor-pointer hover:underline"
                          title="Click to view dispatch history"
                        >
                          {isSent ? (
                            <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Sent ({invoice.sent_count}x)</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              Not Sent
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Lightweight PDF Preview Button */}
                          <button
                            onClick={() => setPreviewInvoice(invoice)}
                            className="p-1.5 rounded-xl text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Lightweight PDF Document Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Download PDF Button */}
                          <button
                            onClick={() => handleDownloadPDF(invoice)}
                            disabled={isDownloading}
                            className="p-1.5 rounded-xl text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                            title="Download Vector PDF"
                          >
                            {isDownloading ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-[#ff6452]" />
                            ) : (
                              <FileDown className="w-4 h-4" />
                            )}
                          </button>

                          {/* Send / Resend Email Button */}
                          <button
                            onClick={() => setSendInvoiceTarget(invoice)}
                            className="px-2.5 py-1 rounded-xl bg-gray-900 dark:bg-slate-800 hover:bg-[#ff6452] hover:text-white text-white text-[11px] font-extrabold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                            title={isSent ? 'Resend Invoice Email' : 'Send Invoice Email'}
                          >
                            <Send className="w-3 h-3" />
                            <span>{isSent ? 'Resend' : 'Send'}</span>
                          </button>

                          {/* Full Audit Log Secondary View */}
                          <button
                            onClick={() => setAuditLogInvoice(invoice)}
                            className="p-1.5 rounded-xl text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="View Full Lifecycle Audit Trail"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Resend Confirmation Modal */}
      {showBulkResendModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-[#ff6452] flex items-center justify-center font-bold">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    Bulk Invoice Email Dispatch
                  </h3>
                  <p className="text-xs text-gray-400">
                    Send {selectedIds.length} invoice(s) simultaneously
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkResendModal(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-slate-300">
              You are about to batch dispatch official SARS Tax Invoices to{' '}
              <strong className="text-gray-900 dark:text-white">{selectedIds.length} customer(s)</strong>. Each recipient will receive a verified PDF copy with tax reconciliation details.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
                Optional Custom Note to Include:
              </label>
              <textarea
                rows={3}
                value={bulkResendMessage}
                onChange={(e) => setBulkResendMessage(e.target.value)}
                placeholder="e.g. Please find attached your official tax invoice copy for your records..."
                className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[#ff6452]/20 focus:border-[#ff6452] outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkResendModal(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkResend}
                disabled={isBulkResending}
                className="px-5 py-2.5 rounded-xl bg-[#ff6452] hover:bg-[#ff4935] text-white text-xs font-black transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isBulkResending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching {selectedIds.length} Invoices...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch {selectedIds.length} Invoices Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightweight PDF Preview Modal with Pre-Send Controls */}
      <InvoicePreviewModal
        isOpen={!!previewInvoice}
        onClose={() => setPreviewInvoice(null)}
        invoice={previewInvoice}
        companySettings={settings}
        onSendEmail={(inv) => {
          setPreviewInvoice(null);
          setSendInvoiceTarget(inv);
        }}
        onViewAudit={(inv) => {
          setPreviewInvoice(null);
          setAuditLogInvoice(inv);
        }}
      />

      {/* Send Invoice Modal */}
      <SendInvoiceModal
        isOpen={!!sendInvoiceTarget}
        onClose={() => setSendInvoiceTarget(null)}
        invoice={sendInvoiceTarget}
        onSend={handleSendInvoice}
      />

      {/* Invoice History Drawer */}
      <InvoiceHistoryDrawer
        isOpen={!!historyInvoice}
        onClose={() => setHistoryInvoice(null)}
        invoice={historyInvoice}
        onResend={(inv) => {
          setHistoryInvoice(null);
          setSendInvoiceTarget(inv);
        }}
        onOpenFullAuditModal={(inv) => {
          setHistoryInvoice(null);
          setAuditLogInvoice(inv);
        }}
      />

      {/* Dedicated Secondary Audit Log Modal */}
      <InvoiceAuditLogModal
        isOpen={!!auditLogInvoice}
        onClose={() => setAuditLogInvoice(null)}
        invoice={auditLogInvoice}
        onResend={(inv) => {
          setAuditLogInvoice(null);
          setSendInvoiceTarget(inv);
        }}
      />
    </div>
  );
};
