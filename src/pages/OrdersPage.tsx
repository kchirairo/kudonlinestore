import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, ChevronRight, FileDown, RefreshCw, Truck } from 'lucide-react';
import { orderService } from '../services/orderService';
import { useShop } from '../context/ShopContext';
import { Order } from '../types';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { EmptyState } from '../components/EmptyState';
import { STORE_CONFIG } from '../constants/config';
import { SEOHead } from '../components/SEOHead';
import { generateOrderInvoicePDF } from '../utils/invoiceGenerator';
import { TrackOrderModal } from '../components/TrackOrderModal';

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, showToast } = useShop();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState<boolean>(false);

  const handleDownloadInvoice = async (e: React.MouseEvent, order: Order) => {
    e.stopPropagation(); // prevent opening order details page
    setDownloadingOrderId(order.id);
    try {
      await generateOrderInvoicePDF(order);
      showToast(`Invoice for Order #${order.id} downloaded successfully!`, 'success');
    } catch (err: any) {
      console.error('[Invoice] Failed to generate PDF invoice:', err);
      showToast('Failed to generate PDF invoice. Please try again.', 'error');
    } finally {
      setDownloadingOrderId(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    orderService.getUserOrders(user?.id).then((res) => {
      if (isMounted) {
        setOrders(res);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  if (isLoading) {
    return (
      <>
        <SEOHead
          title={`My Orders | ${STORE_CONFIG.STORE_NAME}`}
          description="Track your customer orders on KUD Store South Africa."
          canonicalPath="/orders"
          noindex={true}
        />
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4 animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-slate-800 rounded-md w-1/4" />
          <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
          <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title={`My Orders | ${STORE_CONFIG.STORE_NAME}`}
        description="Track your customer orders on KUD Store South Africa."
        canonicalPath="/orders"
        noindex={true}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          My Orders ({orders.length})
        </h1>

        <button
          id="orders-track-by-id-btn"
          type="button"
          onClick={() => setIsTrackModalOpen(true)}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
        >
          <Truck className="w-4 h-4 text-[#ff6452]" />
          <span>Track by Order ID</span>
        </button>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="When you place orders on KUD Store, they will show up here with live status updates."
          actionText="Start Shopping"
          onAction={() => navigate('/')}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-4"
            >
              {/* Order Header */}
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-gray-900 dark:text-white text-base">
                      Order #{order.id}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
                    Placed on {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-gray-900 dark:text-white">
                    {STORE_CONFIG.STORE_CURRENCY}
                    {order.total_amount.toLocaleString()}
                  </span>
                  <p className="text-[11px] text-gray-400 dark:text-slate-400">{order.payment_method}</p>
                </div>
              </div>

              {/* Order Item Thumbnails */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {order.items.slice(0, 4).map((item, idx) => (
                    <img
                      key={idx}
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-12 h-12 rounded-xl object-cover bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800"
                    />
                  ))}
                  {order.items.length > 4 && (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-slate-300">
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleDownloadInvoice(e, order)}
                    disabled={downloadingOrderId === order.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:text-gray-900 dark:hover:text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                    title="Download Tax Invoice (PDF)"
                  >
                    {downloadingOrderId === order.id ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#ff6452]" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="w-3.5 h-3.5 text-[#ff6452]" />
                        <span>Download Invoice</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1 text-xs font-bold text-[#ff6452] pl-1">
                    <span>Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Support Help Banner */}
      <div className="mt-6 bg-[#eff6ff] dark:bg-slate-900/90 rounded-3xl p-5 border border-blue-100 dark:border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Need help with an order?</h3>
          <p className="text-xs text-gray-600 dark:text-slate-300 mt-0.5">
            Contact KUD Store support at{' '}
            <a
              href={`mailto:${STORE_CONFIG.CONTACT_EMAIL}`}
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {STORE_CONFIG.CONTACT_EMAIL}
            </a>{' '}
            or WhatsApp{' '}
            <a
              href={`https://wa.me/${STORE_CONFIG.WHATSAPP_SUPPORT.replace(/[^0-9]/g, '')}`}
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
            href={`mailto:${STORE_CONFIG.CONTACT_EMAIL}?subject=Order%20Help%20Request`}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl border border-blue-200 dark:border-slate-700 transition-colors text-center inline-flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <span>Email Support</span>
          </a>
          <a
            href={`https://wa.me/${STORE_CONFIG.WHATSAPP_SUPPORT.replace(/[^0-9]/g, '')}?text=Hi%20KUD%20Store%2C%20I%20need%20help%20with%20an%20order`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors text-center inline-flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <span>WhatsApp</span>
          </a>
        </div>
      </div>

      <TrackOrderModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
      />
    </div>
    </>
  );
};
