import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Save,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  FileDown,
  RefreshCw,
  MailCheck,
  MailWarning,
  Send,
  Eye,
  X,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Order, OrderStatus, PaymentStatus } from '../../types';
import { OrderStatusBadge } from '../../components/OrderStatusBadge';
import { PaymentStatusBadge } from '../../components/admin/PaymentStatusBadge';
import { useShop } from '../../context/ShopContext';
import { STORE_CONFIG } from '../../constants/config';
import { generateOrderInvoicePDF } from '../../utils/invoiceGenerator';
import { calculateOrderFinancials, formatCurrency, VAT_RATE } from '../../utils/taxUtils';
import { generateOrderConfirmationEmail } from '../../email/orderConfirmationTemplate';

export const AdminOrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useShop();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState<boolean>(false);
  const [isResendingEmail, setIsResendingEmail] = useState<boolean>(false);
  const [showEmailPreview, setShowEmailPreview] = useState<boolean>(false);
  const [emailPreviewTab, setEmailPreviewTab] = useState<'html' | 'text'>('html');

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setIsDownloadingInvoice(true);
    try {
      await generateOrderInvoicePDF(order);
      showToast(`Invoice for Order #${order.id} downloaded!`, 'success');
    } catch (err: any) {
      console.error('[Admin Invoice] Failed to download invoice:', err);
      showToast('Failed to download invoice PDF.', 'error');
    } finally {
      setIsDownloadingInvoice(false);
    }
  };

  const handleResendConfirmationEmail = async () => {
    if (!order) return;

    const isPaid =
      order.payment_status?.toLowerCase() === 'paid' ||
      order.status?.toLowerCase() === 'confirmed' ||
      order.status?.toLowerCase() === 'processing';

    if (!isPaid) {
      showToast('Purchase confirmation emails can only be dispatched for paid orders.', 'error');
      return;
    }

    const recipientEmail = order.shipping_address?.email || order.customer_email;
    if (order.confirmation_email_sent) {
      const confirmed = window.confirm(
        `A purchase confirmation email was already dispatched on ${
          order.confirmation_email_sent_at
            ? new Date(order.confirmation_email_sent_at).toLocaleString()
            : 'record'
        }.\n\nDo you want to send another confirmation copy to ${recipientEmail || 'customer'}?`
      );
      if (!confirmed) return;
    }

    setIsResendingEmail(true);
    try {
      const res = await adminService.resendOrderConfirmationEmail(order.id);
      if (res.success) {
        showToast(res.message || 'Confirmation email dispatched successfully!', 'success');
        const updated = await adminService.getOrderById(order.id);
        if (updated) {
          setOrder(updated);
        } else {
          setOrder({
            ...order,
            confirmation_email_sent: true,
            confirmation_email_sent_at: res.sentAt || new Date().toISOString(),
            confirmation_email_error: undefined,
            confirmation_email_resend_count: (Number(order.confirmation_email_resend_count) || 0) + 1,
            confirmation_email_last_attempt_at: res.sentAt || new Date().toISOString(),
          });
        }
      } else {
        showToast(res.error || 'Failed to resend confirmation email.', 'error');
        const updated = await adminService.getOrderById(order.id);
        if (updated) setOrder(updated);
      }
    } catch (err: any) {
      showToast(err?.message || 'Error occurred while dispatching email.', 'error');
    } finally {
      setIsResendingEmail(false);
    }
  };

  // Status update state
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('Pending');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus>('Paid');

  useEffect(() => {
    if (!id) return;

    async function loadOrder() {
      setIsLoading(true);
      const res = await adminService.getOrderById(id!);
      if (res) {
        setOrder(res);
        setSelectedStatus(res.status);
        setSelectedPaymentStatus(res.payment_status);
      }
      setIsLoading(false);
    }

    loadOrder();
  }, [id]);

  const handleUpdateStatus = async () => {
    if (!order) return;

    setIsSaving(true);
    const result = await adminService.updateOrderStatus(
      order.id,
      selectedStatus,
      selectedPaymentStatus
    );
    setIsSaving(false);

    if (result.success) {
      setOrder({ ...order, status: selectedStatus, payment_status: selectedPaymentStatus });
      showToast('Order status updated successfully', 'success');
    } else {
      showToast(result.error || 'Failed to update order status.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-md w-1/4" />
        <div className="h-48 bg-gray-200 rounded-3xl" />
        <div className="h-64 bg-gray-200 rounded-3xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <h2 className="text-2xl font-black text-gray-900">Order Not Found</h2>
        <p className="text-xs text-gray-400">
          The requested order ID could not be located in the database.
        </p>
        <button
          onClick={() => navigate('/admin/orders')}
          className="px-6 py-2.5 bg-[#ff6452] text-white font-bold rounded-2xl text-xs"
        >
          Back to Orders List
        </button>
      </div>
    );
  }

  const orderStatuses: OrderStatus[] = [
    'Pending',
    'Confirmed',
    'Processing',
    'Packed',
    'Shipped',
    'Delivered',
    'Cancelled',
    'Refunded',
  ];

  const paymentStatuses: PaymentStatus[] = [
    'Pending',
    'Paid',
    'Failed',
    'Refunded',
    'Partially Refunded',
  ];

  const fin = calculateOrderFinancials(order);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Top back button and action bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/admin/orders')}
          className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-2xl transition-all shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Orders</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadInvoice}
          disabled={isDownloadingInvoice}
          className="flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 px-4 py-2 rounded-2xl transition-all shadow-2xs cursor-pointer disabled:opacity-50"
        >
          {isDownloadingInvoice ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#ff6452]" />
              <span>Generating Invoice...</span>
            </>
          ) : (
            <>
              <FileDown className="w-3.5 h-3.5 text-[#ff6452]" />
              <span>Download Tax Invoice (PDF)</span>
            </>
          )}
        </button>
      </div>

      {/* Admin Quick Status Update Panel */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-6 text-white space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-700 pb-4">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-[#ff6452]" />
            <h2 className="text-base font-black tracking-tight">Fulfillment & Payment Control</h2>
          </div>
          <span className="text-[11px] font-bold text-gray-300">
            Order #{order.id}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Order Status Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300">Order Fulfillment Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-2xl text-xs font-extrabold text-white focus:outline-none focus:border-[#ff6452]"
            >
              {orderStatuses.map((st) => (
                <option key={st} value={st} className="bg-gray-900 text-white">
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300">Payment Status</label>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value as PaymentStatus)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-2xl text-xs font-extrabold text-white focus:outline-none focus:border-[#ff6452]"
            >
              {paymentStatuses.map((pst) => (
                <option key={pst} value={pst} className="bg-gray-900 text-white">
                  {pst}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleUpdateStatus}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-[#ff6452] hover:bg-[#ff4935] text-white text-xs font-black rounded-2xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Order Changes'}</span>
          </button>
        </div>
      </div>

      {/* Main Order Details Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-8">
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-gray-900">Order #{order.id}</h1>
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.payment_status} />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Placed on {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          {(() => {
            const fin = calculateOrderFinancials(order);
            return (
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                  Grand Total (Incl. 15% VAT)
                </span>
                <span className="text-2xl font-black text-gray-900">
                  {formatCurrency(fin.grandTotal)}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Customer & Shipping Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Info */}
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <User className="w-4 h-4 text-[#ff6452]" />
              <span>Customer Information</span>
            </div>
            <div className="space-y-1.5 text-xs text-gray-700">
              <p className="font-extrabold text-gray-900 text-sm">
                {order.shipping_address?.fullName || order.customer_name}
              </p>
              <div className="flex items-center gap-2 text-gray-500">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <span>{order.shipping_address?.email || order.customer_email || 'No email provided'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span>{order.shipping_address?.phone || 'No phone provided'}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <MapPin className="w-4 h-4 text-[#ff6452]" />
              <span>Delivery Address</span>
            </div>
            <div className="space-y-1 text-xs text-gray-600">
              <p className="font-bold text-gray-900">{order.shipping_address?.fullName}</p>
              <p>{order.shipping_address?.addressLine}</p>
              <p>
                {order.shipping_address?.city}, {order.shipping_address?.province},{' '}
                {order.shipping_address?.postalCode}
              </p>
            </div>
          </div>
        </div>

        {/* Customer Purchase Confirmation Email Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-[#ff6452] shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900 tracking-tight">
                  Purchase Confirmation Email System
                </h3>
                <p className="text-[11px] text-gray-500">
                  Automated transactional receipt dispatched via Supabase Edge Function & Resend
                </p>
              </div>
            </div>

            {/* Email Status Badge */}
            <div>
              {order.confirmation_email_sent ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <MailCheck className="w-3.5 h-3.5" />
                  Delivered & Logged
                </span>
              ) : fin.isPaid && order.confirmation_email_error ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                  <MailWarning className="w-3.5 h-3.5" />
                  Dispatch Failed
                </span>
              ) : fin.isPaid ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-3.5 h-3.5" />
                  Pending Dispatch
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                  Awaiting Verified Payment
                </span>
              )}
            </div>
          </div>

          {/* Error Callout if any */}
          {order.confirmation_email_error && (
            <div className="bg-rose-50/90 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-extrabold text-rose-900">Email Delivery Issue Reported</p>
                <p className="font-mono text-[11px] text-rose-700 bg-rose-100/50 p-2 rounded-lg break-all">
                  {order.confirmation_email_error}
                </p>
                <p className="text-[11px] text-rose-600">
                  Note: Customer payment remains <strong>PAID</strong> and verified. Click &ldquo;Resend Confirmation Email&rdquo; below to retry dispatching to the customer.
                </p>
              </div>
            </div>
          )}

          {/* Email Audit Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Recipient Email
              </span>
              <p className="font-bold text-gray-900 truncate" title={order.shipping_address?.email || order.customer_email}>
                {order.shipping_address?.email || order.customer_email || 'None on record'}
              </p>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Initial Sent Time
              </span>
              <p className="font-bold text-gray-900">
                {order.confirmation_email_sent_at
                  ? new Date(order.confirmation_email_sent_at).toLocaleString('en-ZA', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })
                  : 'Not yet sent'}
              </p>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Resend Attempts
              </span>
              <p className="font-bold text-gray-900">
                {order.confirmation_email_resend_count || 0} manual {order.confirmation_email_resend_count === 1 ? 'resend' : 'resends'}
              </p>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Last Attempt
              </span>
              <p className="font-bold text-gray-900">
                {order.confirmation_email_last_attempt_at
                  ? new Date(order.confirmation_email_last_attempt_at).toLocaleString('en-ZA', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })
                  : 'None'}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Idempotent protection active (Duplicate prevention enabled)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmailPreview(true)}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-gray-600" />
                <span>Preview Email</span>
              </button>

              <button
                type="button"
                onClick={handleResendConfirmationEmail}
                disabled={isResendingEmail || !fin.isPaid}
                className="px-4 py-2 bg-[#ff6452] hover:bg-[#ff523d] text-white text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResendingEmail ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {order.confirmation_email_sent ? 'Resend Confirmation Email' : 'Send Confirmation Email'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Itemized Order Table */}
        <div className="space-y-4">
          <h3 className="text-base font-black text-gray-900">Purchased Items ({order.items.length})</h3>

          <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="p-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                <img
                  src={item.product_image}
                  alt={item.product_name}
                  className="w-16 h-16 rounded-xl object-cover bg-gray-50 border border-gray-100 flex-shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase">
                    {item.product_brand}
                  </span>
                  <h4 className="text-sm font-bold text-gray-900 truncate">{item.product_name}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Qty: <span className="font-bold text-gray-800">{item.quantity}</span>
                    {item.variant && ` • Size: ${item.variant}`}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400 font-medium">
                    {STORE_CONFIG.STORE_CURRENCY}
                    {item.unit_price.toLocaleString()} each
                  </p>
                  <p className="text-sm font-black text-gray-900">
                    {STORE_CONFIG.STORE_CURRENCY}
                    {item.total_price.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment & Order Financial Breakdown */}
        {(() => {
          const fin = calculateOrderFinancials(order);
          return (
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-3 max-w-md ml-auto text-xs">
              <div className="flex items-center gap-2 font-black text-gray-900 text-sm border-b border-gray-200 pb-2">
                <CreditCard className="w-4 h-4 text-[#ff6452]" />
                <span>Order Financial Breakdown</span>
              </div>

              <div className="space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-gray-900">{formatCurrency(fin.subtotal)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Courier Delivery</span>
                  <span className="font-bold text-gray-900">
                    {fin.deliveryFee === 0 ? 'FREE' : formatCurrency(fin.deliveryFee)}
                  </span>
                </div>

                {fin.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount Applied</span>
                    <span>-{formatCurrency(fin.discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>VAT ({Math.round(VAT_RATE * 100)}%)</span>
                  <span className="font-bold text-gray-900">{formatCurrency(fin.vatAmount)}</span>
                </div>

                <div className="flex justify-between text-gray-600 pt-1 border-t border-gray-200">
                  <span>Payment Method</span>
                  <span className="font-bold text-gray-900">{order.payment_method || 'Online Payment'}</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Payment Status</span>
                  <span className={`font-bold ${fin.isPaid ? 'text-emerald-600' : fin.isFailed ? 'text-rose-600' : 'text-amber-600'}`}>
                    {fin.statusLabel}
                  </span>
                </div>

                <div className="flex justify-between font-black text-gray-900 text-base pt-2 border-t border-gray-200">
                  <span>{fin.isPaid ? 'TOTAL PAID' : 'TOTAL DUE'}</span>
                  <span className="text-[#ff6452]">{formatCurrency(fin.grandTotal)}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Email Preview Modal */}
      {showEmailPreview && order && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-2.5">
                <Mail className="w-5 h-5 text-[#ff6452]" />
                <div>
                  <h3 className="text-sm font-black text-gray-900">Purchase Confirmation Email Preview</h3>
                  <p className="text-[11px] text-gray-500">
                    Recipient: {order.shipping_address?.email || order.customer_email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-xl bg-gray-200/80 p-0.5 text-xs font-bold">
                  <button
                    onClick={() => setEmailPreviewTab('html')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      emailPreviewTab === 'html'
                        ? 'bg-white text-gray-900 shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    HTML Preview
                  </button>
                  <button
                    onClick={() => setEmailPreviewTab('text')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      emailPreviewTab === 'text'
                        ? 'bg-white text-gray-900 shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Plain Text
                  </button>
                </div>

                <button
                  onClick={() => setShowEmailPreview(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-100/50">
              {(() => {
                const generated = generateOrderConfirmationEmail({
                  customerName: order.shipping_address?.fullName || order.customer_name || 'Valued Customer',
                  customerEmail: order.shipping_address?.email || order.customer_email || '',
                  customerPhone: order.shipping_address?.phone,
                  orderNumber: order.order_number || `KUD-${order.id.slice(0, 6).toUpperCase()}`,
                  orderDate: new Date(order.created_at).toLocaleDateString('en-ZA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  paymentMethod: order.payment_method || 'Yoco Secure Checkout',
                  paymentReference: (order as any).payment_id,
                  items: order.items.map((i) => ({
                    product_name: i.product_name,
                    product_image: i.product_image,
                    product_brand: i.product_brand,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    total_price: i.total_price,
                    variant: i.variant,
                  })),
                  subtotal: fin.subtotal,
                  shippingFee: fin.deliveryFee,
                  discount: fin.discountAmount,
                  total: fin.grandTotal,
                  deliveryAddress: order.shipping_address?.addressLine || '',
                  deliveryCity: order.shipping_address?.city || '',
                  deliveryProvince: order.shipping_address?.province || '',
                  deliveryPostalCode: order.shipping_address?.postalCode || '',
                  isResend: Boolean(order.confirmation_email_sent),
                });

                if (emailPreviewTab === 'text') {
                  return (
                    <pre className="p-4 bg-gray-900 text-gray-100 rounded-2xl text-xs font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
                      {generated.text}
                    </pre>
                  );
                }

                return (
                  <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-xs">
                    <iframe
                      title="Confirmation Email HTML Preview"
                      srcDoc={generated.html}
                      className="w-full h-[540px] border-0"
                    />
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">
                Matches the template generated by the send-order-confirmation Edge Function
              </span>
              <button
                onClick={() => setShowEmailPreview(false)}
                className="px-4 py-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
