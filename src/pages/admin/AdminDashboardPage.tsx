import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Clock,
  RefreshCw,
  CheckCircle2,
  Users,
  Package,
  Plus,
  ArrowRight,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { AdminStats, Order, SalesDataPoint } from '../../types';
import { OrderStatusBadge } from '../../components/OrderStatusBadge';
import { PaymentStatusBadge } from '../../components/admin/PaymentStatusBadge';
import { SalesChart } from '../../components/admin/SalesChart';
import { InventoryManagementWidget } from '../../components/admin/InventoryManagementWidget';
import { STORE_CONFIG } from '../../constants/config';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, ordersRes, salesRes] = await Promise.all([
        adminService.getAdminStats(),
        adminService.getOrders({ sortBy: 'newest' }),
        adminService.getSalesOverview(7),
      ]);

      setStats(statsRes);
      setRecentOrders(ordersRes.slice(0, 6));
      setSalesData(salesRes);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-3xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-3xl" />
        <div className="h-80 bg-gray-200 rounded-3xl" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Sales',
      value: `${STORE_CONFIG.STORE_CURRENCY}${stats?.totalSales.toLocaleString() || '0'}`,
      subtitle: 'Revenue from paid orders',
      icon: DollarSign,
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: "Today's Sales",
      value: `${STORE_CONFIG.STORE_CURRENCY}${stats?.todaySales.toLocaleString() || '0'}`,
      subtitle: 'Earned today',
      icon: TrendingUp,
      iconBg: 'bg-[#ff6452]/10 text-[#ff6452]',
    },
    {
      title: 'Total Orders',
      value: stats?.totalOrders || 0,
      subtitle: 'All-time volume',
      icon: ShoppingBag,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Pending Orders',
      value: stats?.pendingOrders || 0,
      subtitle: 'Awaiting fulfillment',
      icon: Clock,
      iconBg: 'bg-amber-50 text-amber-600',
    },
    {
      title: 'Processing Orders',
      value: stats?.processingOrders || 0,
      subtitle: 'Being prepared',
      icon: RefreshCw,
      iconBg: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Delivered Orders',
      value: stats?.deliveredOrders || 0,
      subtitle: 'Successfully completed',
      icon: CheckCircle2,
      iconBg: 'bg-teal-50 text-teal-600',
    },
    {
      title: 'Total Customers',
      value: stats?.totalCustomers || 0,
      subtitle: 'Registered profiles',
      icon: Users,
      iconBg: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Active Products',
      value: stats?.activeProducts || 0,
      subtitle: 'In stock catalog',
      icon: Package,
      iconBg: 'bg-rose-50 text-rose-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#ff6452]">
            System Operational
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Store Command Center
          </h2>
          <p className="text-xs text-gray-300 max-w-xl leading-relaxed">
            Monitor real-time sales performance, review live incoming orders, manage inventory, and manage customer relations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => navigate('/admin/products/new')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#ff6452] hover:bg-[#ff4935] text-white px-5 py-3 rounded-2xl text-xs font-black transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
          <button
            onClick={() => navigate('/admin/orders')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
          >
            <span>Manage Orders</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 8 Statistics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs hover:border-gray-200 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">{card.title}</span>
                <div className={`w-9 h-9 rounded-2xl ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900 tracking-tight">{card.value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{card.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sales Overview Chart */}
      <SalesChart data={salesData} />

      {/* Inventory Management Section */}
      <InventoryManagementWidget onInventoryUpdated={loadDashboardData} />

      {/* Recent Orders Table / Mobile List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-tight">Recent Orders</h3>
            <p className="text-xs text-gray-400">Latest activity across the storefront</p>
          </div>

          <button
            onClick={() => navigate('/admin/orders')}
            className="flex items-center gap-1.5 text-xs font-bold text-[#ff6452] hover:text-[#ff4935] transition-colors"
          >
            <span>View All ({stats?.totalOrders || 0})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-gray-900">No recent orders found</p>
            <p className="text-xs text-gray-400">Orders placed by customers will appear here.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="py-3.5 px-6">Order Number</th>
                    <th className="py-3.5 px-6">Customer</th>
                    <th className="py-3.5 px-6">Date</th>
                    <th className="py-3.5 px-6">Total</th>
                    <th className="py-3.5 px-6">Payment</th>
                    <th className="py-3.5 px-6">Order Status</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
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
                          className="p-2 text-gray-400 hover:text-[#ff6452] hover:bg-rose-50 rounded-xl transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                  className="p-4 space-y-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-gray-900 text-sm">#{order.id}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-gray-900">{order.customer_name}</p>
                      <p className="text-gray-400 text-[11px]">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-black text-gray-900">
                        {STORE_CONFIG.STORE_CURRENCY}
                        {order.total_amount.toLocaleString()}
                      </p>
                      <PaymentStatusBadge status={order.payment_status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
