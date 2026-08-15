import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  DollarSign,
  Eye,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Customer, Order } from '../../types';
import { OrderStatusBadge } from '../../components/OrderStatusBadge';
import { PaymentStatusBadge } from '../../components/admin/PaymentStatusBadge';
import { STORE_CONFIG } from '../../constants/config';

export const AdminCustomerDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!id) return;

    async function loadCustomerData() {
      setIsLoading(true);
      const [cust, custOrders] = await Promise.all([
        adminService.getCustomerById(id!),
        adminService.getCustomerOrders(id!),
      ]);

      setCustomer(cust);
      setOrders(custOrders);
      setIsLoading(false);
    }

    loadCustomerData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-md w-1/4" />
        <div className="h-40 bg-gray-200 rounded-3xl" />
        <div className="h-64 bg-gray-200 rounded-3xl" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Customer Not Found</h2>
        <button
          onClick={() => navigate('/admin/customers')}
          className="px-6 py-2.5 bg-[#ff6452] text-white font-bold rounded-2xl text-xs"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/customers')}
        className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-2xl transition-all shadow-2xs"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Directory</span>
      </button>

      {/* Profile Header & Summary Cards */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#ff6452] text-white flex items-center justify-center text-xl font-black shadow-xs">
              {customer.fullName ? customer.fullName[0] : 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-gray-900">{customer.fullName}</h1>
                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-extrabold uppercase rounded-full">
                  {customer.role}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Registered on {new Date(customer.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
              <Mail className="w-4 h-4 text-[#ff6452]" />
              <span>Email Address</span>
            </div>
            <p className="font-bold text-gray-900 text-xs truncate">{customer.email}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
              <Phone className="w-4 h-4 text-[#ff6452]" />
              <span>Phone Number</span>
            </div>
            <p className="font-bold text-gray-900 text-xs">{customer.phone || 'Not provided'}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
              <DollarSign className="w-4 h-4 text-[#ff6452]" />
              <span>Total Lifetime Spend</span>
            </div>
            <p className="font-black text-gray-900 text-sm">
              {STORE_CONFIG.STORE_CURRENCY}
              {customer.totalSpent.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Customer Order History */}
        <div className="space-y-4 pt-2">
          <h3 className="text-base font-black text-gray-900">
            Order History ({orders.length})
          </h3>

          {orders.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
              <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-xs font-bold text-gray-600">No orders placed by this customer yet.</p>
            </div>
          ) : (
            <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100">
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50/60 transition-colors cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gray-900 text-sm">#{order.id}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(order.created_at).toLocaleString()} • {order.items.length} items
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-black text-gray-900 text-sm block">
                        {STORE_CONFIG.STORE_CURRENCY}
                        {order.total_amount.toLocaleString()}
                      </span>
                      <PaymentStatusBadge status={order.payment_status} />
                    </div>

                    <Eye className="w-4 h-4 text-gray-400 hover:text-[#ff6452] transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
