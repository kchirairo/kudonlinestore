import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, ChevronRight, FileDown, RefreshCw } from 'lucide-react';
import { orderService } from '../services/orderService';
import { useShop } from '../context/ShopContext';
import { Order } from '../types';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { EmptyState } from '../components/EmptyState';
import { STORE_CONFIG } from '../constants/config';
import { SEOHead } from '../components/SEOHead';
import { generateOrderInvoicePDF } from '../utils/invoiceGenerator';

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, showToast } = useShop();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);

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
          <div className="h-8 bg-gray-200 rounded-md w-1/4" />
          <div className="h-32 bg-gray-200 rounded-3xl" />
          <div className="h-32 bg-gray-200 rounded-3xl" />
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
      <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-6">
        My Orders ({orders.length})
      </h1>

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
              className="bg-white rounded-3xl p-5 border border-gray-100 hover:border-gray-200 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-4"
            >
              {/* Order Header */}
              <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-gray-900 text-base">
                      Order #{order.id}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Placed on {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-gray-900">
                    {STORE_CONFIG.STORE_CURRENCY}
                    {order.total_amount.toLocaleString()}
                  </span>
                  <p className="text-[11px] text-gray-400">{order.payment_method}</p>
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
                      className="w-12 h-12 rounded-xl object-cover bg-gray-50 border border-gray-100"
                    />
                  ))}
                  {order.items.length > 4 && (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleDownloadInvoice(e, order)}
                    disabled={downloadingOrderId === order.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 hover:text-gray-900 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
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
    </div>
    </>
  );
};
