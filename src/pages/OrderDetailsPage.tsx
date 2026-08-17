import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Package, MapPin, CreditCard, Clock, CheckCircle2, ShoppingBag, FileDown, RefreshCw } from 'lucide-react';
import { orderService } from '../services/orderService';
import { useShop } from '../context/ShopContext';
import { Order } from '../types';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { STORE_CONFIG } from '../constants/config';
import { SEOHead } from '../components/SEOHead';
import { generateOrderInvoicePDF } from '../utils/invoiceGenerator';

export const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast, clearCart } = useShop();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPaymentJustSuccess, setIsPaymentJustSuccess] = useState<boolean>(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState<boolean>(false);
  const paymentHandledRef = useRef<boolean>(false);

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setIsGeneratingInvoice(true);
    try {
      await generateOrderInvoicePDF(order);
      showToast(`Invoice for Order #${order.id} downloaded successfully!`, 'success');
    } catch (err: any) {
      console.error('[Invoice] Failed to download PDF invoice:', err);
      showToast('Failed to generate PDF invoice. Please try again.', 'error');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setIsLoading(true);

    const isPaymentSuccess =
      searchParams.get('payment') === 'success' ||
      searchParams.get('status') === 'success';

    const processedKey = `kud_order_paid_${id}`;
    const alreadyProcessed = sessionStorage.getItem(processedKey) === 'true';

    if (isPaymentSuccess && !paymentHandledRef.current && !alreadyProcessed) {
      paymentHandledRef.current = true;
      sessionStorage.setItem(processedKey, 'true');
      setIsPaymentJustSuccess(true);
      clearCart();
      showToast('Payment successful! Your order has been placed.', 'success');

      // Safely remove query parameters from URL without reloading
      try {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      } catch {
        // Safe fallback
      }
    } else if (isPaymentSuccess || alreadyProcessed) {
      setIsPaymentJustSuccess(true);
    }

    orderService.getOrderById(id).then((res) => {
      if (isMounted) {
        setOrder(res);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <>
        <SEOHead
          title={`Order Status | ${STORE_CONFIG.STORE_NAME}`}
          description="Order confirmation details."
          canonicalPath="/orders"
          noindex={true}
        />
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4 animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-slate-800 rounded-md w-1/3" />
          <div className="h-40 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <SEOHead
          title={`Order Not Found | ${STORE_CONFIG.STORE_NAME}`}
          description="Order not found."
          canonicalPath="/orders"
          noindex={true}
        />
        <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Order not found</h2>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 bg-[#ff6452] text-white font-bold rounded-full text-sm shadow-md hover:bg-[#ff523d] transition-colors cursor-pointer"
            >
              Return to Store
            </button>
            <button
              onClick={() => navigate('/orders')}
              className="px-6 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-bold rounded-full text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              View Orders
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title={`Order #${order.id} | ${STORE_CONFIG.STORE_NAME}`}
        description="Order details and delivery status."
        canonicalPath={`/orders/${order.id}`}
        noindex={true}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28">
      {/* Top Navigation Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Orders</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadInvoice}
            disabled={isGeneratingInvoice}
            className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-slate-200 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 px-4 py-1.5 rounded-full shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {isGeneratingInvoice ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#ff6452]" />
                <span>Preparing PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 text-[#ff6452]" />
                <span>Download Invoice</span>
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-[#ff6452] hover:bg-[#ff523d] px-4 py-1.5 rounded-full shadow-xs transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Continue Shopping</span>
          </button>
        </div>
      </div>

      {isPaymentJustSuccess && (
        <div className="mb-6 p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-extrabold text-base text-emerald-950 dark:text-emerald-100">Payment Successful & Order Confirmed!</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">Thank you for your purchase. Your payment was authorized and your order is now being processed.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Continue Shopping</span>
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-xs space-y-8">
        {/* Order Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                Order #{order.id}
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">
              Placed on {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-bold uppercase text-gray-400 dark:text-slate-400 block">Total Amount</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {STORE_CONFIG.STORE_CURRENCY}
              {order.total_amount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Delivery Timeline / Status */}
        <div className="bg-gray-50 dark:bg-slate-800/60 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <Clock className="w-4 h-4 text-[#ff6452]" />
            <span>Delivery Status Timeline</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-center font-semibold">
            {['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'].map((st) => {
              const statusOrder = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
              const currentIdx = statusOrder.indexOf(order.status);
              const thisIdx = statusOrder.indexOf(st);
              const isPastOrCurrent = currentIdx >= 0 ? thisIdx <= currentIdx : st === 'Pending';

              return (
                <div
                  key={st}
                  className={`py-2 px-2.5 rounded-xl border ${
                    isPastOrCurrent
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-[#ff6452] border-[#ff6452]/30'
                      : 'bg-white dark:bg-slate-800 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-700'
                  }`}
                >
                  {st}
                </div>
              );
            })}
          </div>
        </div>

        {/* Purchased Items */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Purchased Items</h3>
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-3.5 rounded-2xl bg-gray-50/50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800"
              >
                <img
                  src={item.product_image}
                  alt={item.product_name}
                  className="w-16 h-16 rounded-xl object-cover bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase">
                    {item.product_brand}
                  </span>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {item.product_name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Qty: {item.quantity} {item.variant && `• Size: ${item.variant}`}
                  </p>
                </div>
                <span className="font-extrabold text-gray-900 dark:text-white text-sm">
                  {STORE_CONFIG.STORE_CURRENCY}
                  {item.total_price.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping & Payment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-slate-800 text-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white text-sm">
              <MapPin className="w-4 h-4 text-[#ff6452]" />
              <span>Delivery Address</span>
            </div>
            <p className="font-semibold text-gray-800 dark:text-slate-200">{order.shipping_address.fullName}</p>
            <p className="text-gray-500 dark:text-slate-400">{order.shipping_address.addressLine}</p>
            <p className="text-gray-500 dark:text-slate-400">
              {order.shipping_address.city}, {order.shipping_address.province},{' '}
              {order.shipping_address.postalCode}
            </p>
            <p className="text-gray-500 dark:text-slate-400">Phone: {order.shipping_address.phone}</p>
          </div>

          <div className="space-y-2 bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white text-sm">
              <CreditCard className="w-4 h-4 text-[#ff6452]" />
              <span>Payment Breakdown</span>
            </div>
            <div className="space-y-1 text-gray-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{STORE_CONFIG.STORE_CURRENCY}{order.subtotal_amount}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{STORE_CONFIG.STORE_CURRENCY}{order.delivery_fee}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Status</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                    order.payment_status === 'Paid'
                      ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                      : order.payment_status === 'Failed'
                      ? 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300'
                      : 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {order.payment_status}
                </span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-slate-700">
                <span>
                  {order.payment_status === 'Paid'
                    ? `Total Paid (${order.payment_method})`
                    : `Total Amount (${order.payment_method})`}
                </span>
                <span>{STORE_CONFIG.STORE_CURRENCY}{order.total_amount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Support Help Banner */}
        <div className="bg-[#eff6ff] dark:bg-slate-900/90 rounded-3xl p-5 border border-blue-100 dark:border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Need help with an order?</h3>
            <p className="text-xs text-gray-600 dark:text-slate-300 mt-0.5">
              Contact KUD Store support at{' '}
              <a
                href={`mailto:${STORE_CONFIG.CONTACT_EMAIL}?subject=Help%20with%20Order%20${order.id}`}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {STORE_CONFIG.CONTACT_EMAIL}
              </a>{' '}
              or WhatsApp{' '}
              <a
                href={`https://wa.me/${STORE_CONFIG.WHATSAPP_SUPPORT.replace(/[^0-9]/g, '')}?text=Hi%20KUD%20Store%2C%20I%20need%20help%20with%20Order%20%23${order.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {STORE_CONFIG.WHATSAPP_SUPPORT}
              </a>
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={`mailto:${STORE_CONFIG.CONTACT_EMAIL}?subject=Help%20with%20Order%20${order.id}`}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl border border-blue-200 dark:border-slate-700 transition-colors text-center inline-flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span>Email</span>
            </a>
            <a
              href={`https://wa.me/${STORE_CONFIG.WHATSAPP_SUPPORT.replace(/[^0-9]/g, '')}?text=Hi%20KUD%20Store%2C%20I%20need%20help%20with%20Order%20%23${order.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors text-center inline-flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Action buttons at bottom */}
        <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDownloadInvoice}
            disabled={isGeneratingInvoice}
            className="w-full sm:w-auto px-6 py-3 bg-gray-900 dark:bg-slate-800 hover:bg-black dark:hover:bg-slate-700 text-white font-bold rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGeneratingInvoice ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#ff6452]" />
                <span>Generating Invoice PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 text-[#ff6452]" />
                <span>Download Invoice (PDF)</span>
              </>
            )}
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-6 py-3 bg-[#ff6452] hover:bg-[#ff523d] text-white font-bold rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Continue Shopping</span>
            </button>
            <button
              onClick={() => navigate('/orders')}
              className="w-full sm:w-auto px-6 py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>View All Orders</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};
