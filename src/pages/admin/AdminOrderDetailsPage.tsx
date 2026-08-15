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
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Order, OrderStatus, PaymentStatus } from '../../types';
import { OrderStatusBadge } from '../../components/OrderStatusBadge';
import { PaymentStatusBadge } from '../../components/admin/PaymentStatusBadge';
import { useShop } from '../../context/ShopContext';
import { STORE_CONFIG } from '../../constants/config';
import { generateOrderInvoicePDF } from '../../utils/invoiceGenerator';

export const AdminOrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useShop();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState<boolean>(false);

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

          <div className="text-left sm:text-right">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              Grand Total
            </span>
            <span className="text-2xl font-black text-gray-900">
              {STORE_CONFIG.STORE_CURRENCY}
              {order.total_amount.toLocaleString()}
            </span>
          </div>
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
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-3 max-w-md ml-auto text-xs">
          <div className="flex items-center gap-2 font-black text-gray-900 text-sm border-b border-gray-200 pb-2">
            <CreditCard className="w-4 h-4 text-[#ff6452]" />
            <span>Order Financial Breakdown</span>
          </div>

          <div className="space-y-2 text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-gray-900">
                {STORE_CONFIG.STORE_CURRENCY}
                {order.subtotal_amount.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="font-bold text-gray-900">
                {STORE_CONFIG.STORE_CURRENCY}
                {order.delivery_fee.toLocaleString()}
              </span>
            </div>

            {order.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Discount Applied</span>
                <span>
                  -{STORE_CONFIG.STORE_CURRENCY}
                  {order.discount_amount.toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex justify-between text-gray-600 pt-1 border-t border-gray-200">
              <span>Payment Method</span>
              <span className="font-bold text-gray-900">{order.payment_method}</span>
            </div>

            <div className="flex justify-between font-black text-gray-900 text-base pt-2 border-t border-gray-200">
              <span>Total Paid</span>
              <span className="text-[#ff6452]">
                {STORE_CONFIG.STORE_CURRENCY}
                {order.total_amount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
