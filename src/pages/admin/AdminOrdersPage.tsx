import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowUpDown, ShoppingBag, Eye, RefreshCw } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Order, OrderStatus, PaymentStatus } from '../../types';
import { OrderStatusBadge } from '../../components/OrderStatusBadge';
import { PaymentStatusBadge } from '../../components/admin/PaymentStatusBadge';
import { STORE_CONFIG } from '../../constants/config';

export const AdminOrdersPage: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getOrders({
        search: searchQuery,
        status: statusFilter,
        paymentStatus: paymentFilter,
        sortBy,
      });
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch admin orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [searchQuery, statusFilter, paymentFilter, sortBy]);

  const orderStatusOptions: (OrderStatus | 'All')[] = [
    'All',
    'Pending',
    'Confirmed',
    'Processing',
    'Packed',
    'Shipped',
    'Delivered',
    'Cancelled',
    'Refunded',
  ];

  const paymentStatusOptions: (PaymentStatus | 'All')[] = [
    'All',
    'Pending',
    'Paid',
    'Failed',
    'Refunded',
    'Partially Refunded',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Order Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            View, filter, track, and update all store customer orders.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-2xl text-xs font-bold text-gray-700 transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Field */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search Order #, customer, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:bg-white focus:outline-none focus:border-[#ff6452] font-semibold transition-all"
            />
          </div>

          {/* Order Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 focus:bg-white focus:outline-none focus:border-[#ff6452]"
            >
              <option value="All">Order Status: All</option>
              {orderStatusOptions.slice(1).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 focus:bg-white focus:outline-none focus:border-[#ff6452]"
            >
              <option value="All">Payment Status: All</option>
              {paymentStatusOptions.slice(1).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 focus:bg-white focus:outline-none focus:border-[#ff6452]"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Content */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded-xl w-1/4" />
          <div className="h-16 bg-gray-200 rounded-2xl" />
          <div className="h-16 bg-gray-200 rounded-2xl" />
          <div className="h-16 bg-gray-200 rounded-2xl" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-gray-100 text-center space-y-4">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900">No orders found</h3>
            <p className="text-xs text-gray-400">
              Try adjusting your search query or status filter criteria.
            </p>
          </div>
          {(searchQuery || statusFilter !== 'All' || paymentFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('All');
                setPaymentFilter('All');
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 rounded-full transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          {/* Table view for Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-6">Order Number</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Items</th>
                  <th className="py-3.5 px-6">Total</th>
                  <th className="py-3.5 px-6">Payment</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    <td className="py-4 px-6 font-black text-gray-900">#{order.id}</td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-gray-900">{order.customer_name}</div>
                      <div className="text-[11px] text-gray-400">{order.customer_email}</div>
                    </td>
                    <td className="py-4 px-6 text-gray-500 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 font-semibold text-gray-600">
                      {order.items.reduce((s, i) => s + i.quantity, 0)} items
                    </td>
                    <td className="py-4 px-6 font-black text-gray-900">
                      {STORE_CONFIG.STORE_CURRENCY}
                      {order.total_amount.toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <PaymentStatusBadge status={order.payment_status} />
                    </td>
                    <td className="py-4 px-6">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/orders/${order.id}`);
                        }}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-[#ff6452] hover:text-white text-gray-700 rounded-xl text-xs font-bold transition-all"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards view for Mobile */}
          <div className="md:hidden divide-y divide-gray-100">
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate(`/admin/orders/${order.id}`)}
                className="p-4 space-y-3 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-black text-gray-900 text-sm">#{order.id}</span>
                    <p className="text-xs font-bold text-gray-800">{order.customer_name}</p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                  <div>
                    <span className="text-gray-400 text-[11px]">
                      {new Date(order.created_at).toLocaleDateString()} • {order.items.length} items
                    </span>
                    <p className="font-black text-gray-900 text-sm">
                      {STORE_CONFIG.STORE_CURRENCY}
                      {order.total_amount.toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <PaymentStatusBadge status={order.payment_status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
