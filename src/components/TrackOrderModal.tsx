import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Search,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  ArrowRight,
  MapPin,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { orderService } from '../services/orderService';
import { OrderStatusBadge } from './OrderStatusBadge';
import { STORE_CONFIG } from '../constants/config';
import { Order } from '../types';

interface TrackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string;
}

const ORDER_STEPS = [
  { key: 'pending', label: 'Order Placed', desc: 'Received & awaiting review' },
  { key: 'confirmed', label: 'Confirmed', desc: 'Payment verified' },
  { key: 'processing', label: 'Processing', desc: 'Packed & prepared for dispatch' },
  { key: 'shipped', label: 'Out for Delivery', desc: 'In courier transit' },
  { key: 'delivered', label: 'Delivered', desc: 'Delivered to your address' },
];

export const TrackOrderModal: React.FC<TrackOrderModalProps> = ({
  isOpen,
  onClose,
  initialOrderId = '',
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>(initialOrderId);
  const [searchedOrderId, setSearchedOrderId] = useState<string>('');
  const [order, setOrder] = useState<Order | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial query if provided when opening modal
  useEffect(() => {
    if (isOpen) {
      if (initialOrderId) {
        setSearchQuery(initialOrderId);
        handleTrackOrder(initialOrderId);
      }
    } else {
      // Reset state on close
      setHasSearched(false);
      setOrder(null);
      setErrorMessage(null);
      setSearchQuery('');
    }
  }, [isOpen, initialOrderId]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleTrackOrder = async (queryToUse?: string) => {
    const query = (queryToUse !== undefined ? queryToUse : searchQuery).trim();
    if (!query) {
      setErrorMessage('Please enter an Order ID or Order Reference Number.');
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);
    setHasSearched(true);
    setSearchedOrderId(query);

    try {
      const result = await orderService.trackOrder(query);
      if (result) {
        setOrder(result);
        setErrorMessage(null);
      } else {
        setOrder(null);
        setErrorMessage(
          `No order found matching "${query}". Please check your order confirmation email or receipt and try again.`
        );
      }
    } catch (err: any) {
      console.error('[TrackOrderModal] Error tracking order:', err);
      setOrder(null);
      setErrorMessage(err.message || 'Failed to retrieve order status. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const getStepStatus = (stepKey: string, currentStatus: string) => {
    const statusMap: Record<string, number> = {
      pending: 0,
      confirmed: 1,
      processing: 2,
      shipped: 3,
      delivered: 4,
      completed: 4,
    };

    const currentIdx = statusMap[currentStatus.toLowerCase()] ?? 0;
    const targetIdx = statusMap[stepKey.toLowerCase()] ?? 0;

    if (currentStatus.toLowerCase() === 'cancelled') {
      return 'cancelled';
    }

    if (currentIdx > targetIdx) return 'completed';
    if (currentIdx === targetIdx) return 'current';
    return 'upcoming';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="track-order-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div
          id="track-order-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-[#ff6452] flex items-center justify-center font-bold shadow-2xs">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                  Track Your Order
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Enter your order ID to check live delivery progress
                </p>
              </div>
            </div>

            <button
              id="track-order-close-btn"
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-gray-400 hover:text-gray-700 dark:hover:text-white border border-gray-200 dark:border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-6 max-h-[78vh] overflow-y-auto">
            {/* Search Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTrackOrder();
              }}
              className="space-y-2"
            >
              <label
                htmlFor="track-order-id-input"
                className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-300"
              >
                Order ID or Reference Number
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="track-order-id-input"
                    type="text"
                    required
                    placeholder="e.g. KUD-849201 or order UUID"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-[#ff6452] dark:focus:border-[#ff6452] outline-hidden shadow-2xs font-medium"
                  />
                </div>
                <button
                  id="track-order-submit-btn"
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-5 py-2.5 bg-[#ff6452] hover:bg-[#ff523d] text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Tracking...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Track Order</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-slate-500">
                You can find your order reference on your confirmation email or SMS invoice.
              </p>
            </form>

            {/* Error / Not Found Message */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 flex items-start gap-3 text-xs text-rose-800 dark:text-rose-300"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Order Not Found</p>
                  <p className="leading-relaxed">{errorMessage}</p>
                </div>
              </motion.div>
            )}

            {/* Active Order Result */}
            {order && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                {/* Status & Key Info Card */}
                <div className="bg-gray-50 dark:bg-slate-800/60 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200/70 dark:border-slate-700/80 pb-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 dark:text-white text-base">
                          {order.order_number ? `Order #${order.order_number}` : `Order #${order.id.slice(0, 8)}`}
                        </span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        Placed on {new Date(order.created_at).toLocaleDateString('en-ZA', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[11px] font-bold uppercase text-gray-400 dark:text-slate-500 block">
                        Total Amount
                      </span>
                      <span className="text-lg font-black text-gray-900 dark:text-white">
                        {STORE_CONFIG.STORE_CURRENCY}
                        {order.total_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Timeline Tracker */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-[#ff6452]" />
                      <span>Delivery Progress</span>
                    </div>

                    <div className="relative">
                      {/* Step Progress Line */}
                      <div className="space-y-3">
                        {ORDER_STEPS.map((step, idx) => {
                          const stepState = getStepStatus(step.key, order.status);
                          const isCompleted = stepState === 'completed';
                          const isCurrent = stepState === 'current';

                          return (
                            <div key={step.key} className="flex items-start gap-3 relative">
                              {/* Step circle indicator */}
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-colors ${
                                  isCompleted
                                    ? 'bg-emerald-500 text-white'
                                    : isCurrent
                                    ? 'bg-[#ff6452] text-white ring-4 ring-[#ff6452]/20 animate-pulse'
                                    : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500'
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <span>{idx + 1}</span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1 pt-0.5">
                                <div className="flex items-center justify-between">
                                  <p
                                    className={`text-xs font-bold ${
                                      isCurrent
                                        ? 'text-[#ff6452]'
                                        : isCompleted
                                        ? 'text-gray-900 dark:text-white'
                                        : 'text-gray-400 dark:text-slate-500'
                                    }`}
                                  >
                                    {step.label}
                                  </p>
                                  {isCurrent && (
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-[#ff6452] px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-900/40">
                                      Current Status
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                  {step.desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Location & Items Preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Delivery destination */}
                  <div className="bg-gray-50 dark:bg-slate-800/40 rounded-2xl p-3.5 border border-gray-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-[#ff6452]" />
                      <span>Delivery Address</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                      {order.shipping_address?.fullName || order.customer_name}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2 leading-tight">
                      {[
                        order.shipping_address?.addressLine,
                        order.shipping_address?.city,
                        order.shipping_address?.province,
                        order.shipping_address?.postalCode,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Standard South Africa Delivery'}
                    </p>
                  </div>

                  {/* Payment overview */}
                  <div className="bg-gray-50 dark:bg-slate-800/40 rounded-2xl p-3.5 border border-gray-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Payment Method</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white capitalize">
                      {order.payment_method || 'Yoco / Card'}
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Status: {order.payment_status?.toUpperCase() || 'PAID'}
                    </p>
                  </div>
                </div>

                {/* Items in this order */}
                {order.items && order.items.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                      Order Items ({order.items.length})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60"
                        >
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {item.product_name}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-slate-400">
                              Qty: {item.quantity} {item.variant ? `• ${item.variant}` : ''}
                            </p>
                          </div>
                          <div className="text-right shrink-0 font-bold text-xs text-gray-900 dark:text-white">
                            {STORE_CONFIG.STORE_CURRENCY}
                            {(item.unit_price * item.quantity).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    id="track-order-view-details-btn"
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/orders/${order.id}`);
                    }}
                    className="w-full sm:flex-1 py-3 bg-[#ff6452] hover:bg-[#ff523d] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>View Full Order Details & Invoice</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    id="track-order-search-again-btn"
                    type="button"
                    onClick={() => {
                      setOrder(null);
                      setSearchQuery('');
                      setHasSearched(false);
                    }}
                    className="w-full sm:w-auto px-4 py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Track Another Order
                  </button>
                </div>
              </motion.div>
            )}

            {/* Quick Customer Support Hint */}
            <div className="text-center pt-2 border-t border-gray-100 dark:border-slate-800">
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Having trouble with your delivery?{' '}
                <a
                  href={`https://wa.me/${STORE_CONFIG.WHATSAPP_SUPPORT.replace(/[^0-9]/g, '')}?text=Hi%20KUD%20Store%2C%20I%20need%20help%20tracking%20my%20order${searchedOrderId ? `%20%23${encodeURIComponent(searchedOrderId)}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Chat with us on WhatsApp
                </a>{' '}
                or email{' '}
                <a
                  href={`mailto:${STORE_CONFIG.CONTACT_EMAIL}?subject=Order%20Tracking%20Inquiry%20${searchedOrderId ? encodeURIComponent(searchedOrderId) : ''}`}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {STORE_CONFIG.CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
