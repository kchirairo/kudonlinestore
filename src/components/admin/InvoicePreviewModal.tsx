import React, { useState } from 'react';
import {
  X,
  FileDown,
  Mail,
  Send,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Building,
  Calendar,
  CreditCard,
  User,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Maximize2,
  History,
  FileText,
} from 'lucide-react';
import { Invoice } from '../../types';
import { STORE_CONFIG, DEFAULT_INVOICE_SETTINGS } from '../../constants/config';
import { formatCurrency, VAT_RATE } from '../../utils/taxUtils';
import { generateOrderInvoicePDF } from '../../utils/invoiceGenerator';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSendEmail?: (invoice: Invoice) => void;
  onViewAudit?: (invoice: Invoice) => void;
  companySettings?: typeof DEFAULT_INVOICE_SETTINGS;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSendEmail,
  onViewAudit,
  companySettings = DEFAULT_INVOICE_SETTINGS,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  if (!isOpen || !invoice) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await generateOrderInvoicePDF(invoice);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(150, prev + 15));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(70, prev - 15));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const isPaid =
    invoice.status === 'Paid' ||
    invoice.status === 'Sent' ||
    invoice.payment_status === 'Paid' ||
    invoice.payment_status === 'Completed';

  const vatPercent = Math.round(VAT_RATE * 100);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white">
      <div className="relative bg-slate-100 dark:bg-slate-950 rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden print:border-none print:shadow-none print:max-h-none print:rounded-none animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Control Bar with Zoom, Pre-Send Actions, Print & Download */}
        <div className="p-3 sm:px-6 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 print:hidden z-10">
          {/* Left: Info title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-[#ff6452] flex items-center justify-center font-bold shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-gray-900 dark:text-white text-sm sm:text-base">
                  PDF Preview: {invoice.invoice_number}
                </h3>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isPaid
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {invoice.status.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Order #{invoice.order_number} • Customer: {invoice.customer_name} ({invoice.customer_email})
              </p>
            </div>
          </div>

          {/* Center/Right Controls */}
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-gray-100 dark:bg-slate-800 rounded-xl p-1 border border-gray-200 dark:border-slate-700 text-xs font-bold">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 70}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-2 text-[11px] text-gray-700 dark:text-slate-300 cursor-pointer"
                title="Reset Zoom"
              >
                {zoomLevel}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 150}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 transition-colors cursor-pointer hidden md:flex items-center gap-1.5 text-xs font-bold"
              title="Print Vector Document"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>

            {/* Audit Trail Button */}
            {onViewAudit && (
              <button
                onClick={() => onViewAudit(invoice)}
                className="p-2 rounded-xl text-gray-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 bg-gray-100 dark:bg-slate-800 hover:bg-blue-50 transition-colors cursor-pointer hidden lg:flex items-center gap-1.5 text-xs font-bold"
                title="View Audit Trail"
              >
                <History className="w-4 h-4" />
                <span>Audit</span>
              </button>
            )}

            {/* Download PDF Button */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-3.5 py-2 rounded-xl bg-gray-900 dark:bg-slate-800 hover:bg-black text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isDownloading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#ff6452]" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-[#ff6452]" />
              )}
              <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
            </button>

            {/* Email Customer Pre-Send Button */}
            {onSendEmail && (
              <button
                onClick={() => onSendEmail(invoice)}
                className="px-3.5 py-2 rounded-xl bg-[#ff6452] hover:bg-[#ff523d] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send to Customer</span>
              </button>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pre-Send Status Notice Bar */}
        <div className="bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/60 px-6 py-2.5 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-semibold">
              Pre-Dispatch Inspection Mode: Verified SARS 15% VAT Reconciliation
            </span>
          </div>
          <div className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
            Destination: <strong className="font-bold">{invoice.customer_email}</strong>
          </div>
        </div>

        {/* PDF Document Canvas Viewport */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center bg-slate-200/70 dark:bg-slate-950/80">
          {/* Authentic Document Paper Canvas */}
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease',
            }}
            className="w-full max-w-[800px] bg-white text-gray-900 rounded-xl shadow-xl border border-gray-300 p-8 sm:p-12 space-y-8 print:p-0 print:border-none print:shadow-none print:rounded-none shrink-0"
          >
            {/* Header / Letterhead */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-gray-900 pb-6">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#ff6452] text-white flex items-center justify-center font-black text-xl shadow-sm">
                    K
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-gray-900">
                    {companySettings.companyName || STORE_CONFIG.STORE_NAME}
                  </h1>
                </div>
                <p className="text-xs text-gray-600">{companySettings.companyAddress || '124 Main Street, Sandton, Johannesburg, 2196'}</p>
                <p className="text-xs text-gray-600">
                  Email: {companySettings.companyEmail || STORE_CONFIG.CONTACT_EMAIL} • Tel: {companySettings.companyPhone || STORE_CONFIG.CONTACT_PHONE} • WhatsApp: {companySettings.whatsappSupport || companySettings.companyWhatsapp || STORE_CONFIG.WHATSAPP_SUPPORT}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-md">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>SARS VAT Reg #: {companySettings.vatNumber || DEFAULT_INVOICE_SETTINGS.vatNumber || 'ZA4920192837'}</span>
                </div>
              </div>

              {/* Invoice Meta Banner */}
              <div className="text-left sm:text-right space-y-1 bg-gray-50 p-4 rounded-xl border border-gray-200 min-w-[220px]">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#ff6452] block">
                  OFFICIAL TAX INVOICE
                </span>
                <div className="text-xl font-black text-gray-900">
                  {invoice.invoice_number}
                </div>
                <div className="text-xs text-gray-600">
                  Tax Issue Date: <strong className="text-gray-900">{new Date(invoice.created_at).toLocaleDateString('en-ZA')}</strong>
                </div>
                <div className="text-xs text-gray-600">
                  Order Ref: <strong className="text-gray-900">#{invoice.order_number}</strong>
                </div>
                <div className="text-xs text-gray-600">
                  Payment Status:{' '}
                  <strong className={isPaid ? 'text-emerald-700' : 'text-amber-700'}>
                    {invoice.payment_status?.toUpperCase() || invoice.status.toUpperCase()}
                  </strong>
                </div>
              </div>
            </div>

            {/* Bill To & Ship To Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50/70 p-5 rounded-2xl border border-gray-200 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">
                  BILLED & ISSUED TO:
                </span>
                <p className="text-sm font-bold text-gray-900">{invoice.customer_name}</p>
                <p className="text-gray-600">{invoice.customer_email}</p>
                {invoice.customer_phone && <p className="text-gray-600">{invoice.customer_phone}</p>}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">
                  DELIVERY ADDRESS & TERMS:
                </span>
                {invoice.shipping_address ? (
                  <>
                    <p className="font-medium text-gray-800">{invoice.shipping_address.street_address}</p>
                    <p className="text-gray-600">
                      {invoice.shipping_address.city}, {invoice.shipping_address.postal_code}
                    </p>
                    <p className="text-gray-600">{invoice.shipping_address.country || 'South Africa'}</p>
                  </>
                ) : (
                  <p className="text-gray-500 italic">Standard Storefront Delivery</p>
                )}
                <div className="text-[11px] text-gray-500 pt-1">
                  Method: <span className="font-semibold text-gray-800">{invoice.payment_method || 'Online Gateway'}</span>
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-900 text-white font-extrabold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Item Description</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Unit Price (excl. VAT)</th>
                    <th className="py-3 px-4 text-right">VAT (15%)</th>
                    <th className="py-3 px-4 text-right">Total (incl. VAT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item, idx) => {
                      const grossLine = (item.price || 0) * (item.quantity || 1);
                      const netLine = grossLine / 1.15;
                      const vatLine = grossLine - netLine;
                      const netUnit = item.price / 1.15;

                      return (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900">{item.product_name}</div>
                            {item.size && (
                              <div className="text-[11px] text-gray-500">Size: {item.size}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-gray-800">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-700">
                            {formatCurrency(netUnit)}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-700">
                            {formatCurrency(vatLine)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-gray-900">
                            {formatCurrency(grossLine)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 px-4 text-center text-gray-500 italic">
                        Standard Storefront Merchandise Items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & VAT Breakdown */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
              {/* Payment Receipt / Stamp & SARS Note */}
              <div className="w-full sm:w-1/2 space-y-3">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1.5">
                  <span className="font-black text-gray-900 block text-[11px] uppercase">
                    Tax & Settlement Verification
                  </span>
                  <p className="text-gray-600 text-[11px] leading-relaxed">
                    This document serves as an official South African Tax Invoice issued in accordance with Section 20 of the Value-Added Tax Act. Standard VAT rate of 15% is applicable to all eligible merchandise.
                  </p>
                </div>

                {isPaid && (
                  <div className="border-2 border-dashed border-emerald-600 rounded-xl p-3 bg-emerald-50/50 text-center">
                    <span className="text-xs font-black text-emerald-800 uppercase tracking-widest block">
                      ✓ OFFICIAL PAYMENT RECEIVED & SETTLED
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      Reconciled via {invoice.payment_method || 'Verified Payment Gateway'}
                    </span>
                  </div>
                )}
              </div>

              {/* Numerical Calculation */}
              <div className="w-full sm:w-5/12 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
                  <span>Subtotal (Net excl. VAT):</span>
                  <span className="font-bold text-gray-900">{formatCurrency(invoice.subtotal_amount)}</span>
                </div>

                {invoice.vat_amount > 0 && (
                  <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
                    <span>Tax / VAT:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(invoice.vat_amount)}</span>
                  </div>
                )}

                {invoice.delivery_fee > 0 && (
                  <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
                    <span>Delivery & Logistics:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(invoice.delivery_fee)}</span>
                  </div>
                )}

                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between py-1 border-b border-gray-100 text-emerald-700 font-semibold">
                    <span>Promotional Discount:</span>
                    <span>-{formatCurrency(invoice.discount_amount)}</span>
                  </div>
                )}

                <div className="flex justify-between py-2 border-t-2 border-gray-900 text-sm">
                  <span className="font-black text-gray-900">Grand Total:</span>
                  <span className="font-black text-[#ff6452] text-base">{formatCurrency(invoice.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="border-t border-gray-200 pt-6 text-center text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-700">
                {companySettings.invoiceSupportNote || companySettings.invoiceFooterNote || 'Thank you for your business with KUD Store. For questions or returns, contact support.'}
              </p>
              <p className="text-[10px] text-gray-400">
                Generated via KUD Store Certified Invoicing Engine • Ref #{invoice.invoice_number}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Pre-Send Actions Footer */}
        <div className="p-4 sm:px-6 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Document rendered and ready for vector PDF export or customer transmission.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
            {onSendEmail && (
              <button
                onClick={() => onSendEmail(invoice)}
                className="px-4 py-2 rounded-xl bg-[#ff6452] hover:bg-[#ff4935] text-white text-xs font-black transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Send to Customer</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
