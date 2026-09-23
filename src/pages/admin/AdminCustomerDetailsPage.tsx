import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  DollarSign,
  Eye,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Package,
  Clock,
  CheckCircle2,
  PauseCircle,
  Ban,
  Copy,
  Check,
  Search,
  Award,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Customer, Order } from '../../types';
import { OrderStatusBadge } from '../../components/OrderStatusBadge';
import { PaymentStatusBadge } from '../../components/admin/PaymentStatusBadge';
import { AdminCustomerReferralCard } from '../../components/admin/AdminCustomerReferralCard';
import { AdminCustomerAccountControlCard } from '../../components/admin/AdminCustomerAccountControlCard';
import { AdminCustomerAccountInfoCard } from '../../components/admin/AdminCustomerAccountInfoCard';
import { STORE_CONFIG } from '../../constants/config';

export const AdminCustomerDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Purchase history search and filtering
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'paid' | 'delivered' | 'pending'>('all');

  // Clipboard copy state
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;

    async function loadCustomerData() {
      setIsLoading(true);
      const [cust, custOrders] = await Promise.all([
        adminService.getCustomerById(id!),
        adminService.getCustomerOrders(id!),
      ]);

      // Defense-in-depth: Never display admin account credentials under customer details
      if (
        !cust ||
        cust.role === 'admin' ||
        String(cust.role || '').toLowerCase() === 'admin' ||
        cust.id === 'demo-admin-id' ||
        cust.email?.toLowerCase() === 'admin@kudstore.com'
      ) {
        setCustomer(null);
        setOrders([]);
      } else {
        setCustomer(cust);
        setOrders(custOrders);
      }
      setIsLoading(false);
    }

    loadCustomerData();
  }, [id]);

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyId = (custId: string) => {
    navigator.clipboard.writeText(custId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const scrollToStatusControls = () => {
    const el = document.getElementById('customer-status-controls');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('ring-4', 'ring-[#ff6452]/40', 'transition-all', 'duration-500');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-[#ff6452]/40');
      }, 2200);
    }
  };

  // Lifetime Value & Purchasing Analytics
  const analytics = useMemo(() => {
    if (!customer) {
      return {
        ltv: 0,
        paidCount: 0,
        pendingCount: 0,
        deliveredCount: 0,
        aov: 0,
        totalItems: 0,
        lastOrder: null as Order | null,
        tier: {
          label: 'New Customer',
          color: 'text-slate-700 dark:text-slate-300',
          bg: 'bg-slate-100 dark:bg-slate-800',
          border: 'border-slate-200 dark:border-slate-700',
        },
      };
    }

    const paidOrders = orders.filter((o) => o.payment_status === 'Paid');
    const pendingOrders = orders.filter(
      (o) => o.status === 'pending' || o.payment_status === 'Pending'
    );
    const deliveredOrders = orders.filter((o) => o.status === 'delivered');

    // Calculate Lifetime Value
    const calculatedLtv = paidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const ltv = Math.max(customer.totalSpent || 0, calculatedLtv);

    // Calculate Average Order Value
    const aov = paidOrders.length > 0 ? ltv / paidOrders.length : orders.length > 0 ? ltv / orders.length : 0;

    // Total products purchased across all orders
    const totalItems = orders.reduce((sum, o) => {
      const itemsCount = o.items?.reduce((isum, item) => isum + (item.quantity || 1), 0) || 0;
      return sum + itemsCount;
    }, 0);

    // Most recent order
    const sortedOrders = [...orders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const lastOrder = sortedOrders.length > 0 ? sortedOrders[0] : null;

    // Determine Customer Spend Tier
    let tier = {
      label: 'New Customer',
      color: 'text-slate-700 dark:text-slate-300',
      bg: 'bg-slate-100 dark:bg-slate-800',
      border: 'border-slate-200 dark:border-slate-700',
    };

    if (ltv >= 5000 || orders.length >= 8) {
      tier = {
        label: 'Platinum VIP',
        color: 'text-amber-800 dark:text-amber-300',
        bg: 'bg-amber-100 dark:bg-amber-950/60',
        border: 'border-amber-200 dark:border-amber-900/60',
      };
    } else if (ltv >= 2000 || orders.length >= 4) {
      tier = {
        label: 'Gold Tier',
        color: 'text-purple-800 dark:text-purple-300',
        bg: 'bg-purple-100 dark:bg-purple-950/60',
        border: 'border-purple-200 dark:border-purple-900/60',
      };
    } else if (ltv >= 500 || orders.length >= 2) {
      tier = {
        label: 'Silver Tier',
        color: 'text-blue-800 dark:text-blue-300',
        bg: 'bg-blue-100 dark:bg-blue-950/60',
        border: 'border-blue-200 dark:border-blue-900/60',
      };
    } else if (orders.length >= 1) {
      tier = {
        label: 'Active Shopper',
        color: 'text-emerald-800 dark:text-emerald-300',
        bg: 'bg-emerald-100 dark:bg-emerald-950/60',
        border: 'border-emerald-200 dark:border-emerald-900/60',
      };
    }

    return {
      ltv,
      paidCount: paidOrders.length,
      pendingCount: pendingOrders.length,
      deliveredCount: deliveredOrders.length,
      aov,
      totalItems,
      lastOrder,
      tier,
    };
  }, [customer, orders]);

  // Filtered orders for the purchase history feed
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (orderFilter === 'paid' && order.payment_status !== 'Paid') return false;
      if (orderFilter === 'delivered' && order.status !== 'delivered') return false;
      if (
        orderFilter === 'pending' &&
        order.status !== 'pending' &&
        order.payment_status !== 'Pending'
      )
        return false;

      // Text search
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        const matchesId =
          (order.id || '').toLowerCase().includes(q) ||
          (order.order_number || '').toLowerCase().includes(q);
        const matchesItem = order.items?.some((i) =>
          (i.product_name || '').toLowerCase().includes(q)
        );
        const matchesMethod = (order.payment_method || '').toLowerCase().includes(q);
        return matchesId || matchesItem || matchesMethod;
      }

      return true;
    });
  }, [orders, orderFilter, orderSearch]);

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatDateOnly = (isoString?: string | null) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse p-4 sm:p-6">
        <div className="h-10 bg-gray-200 dark:bg-slate-800 rounded-2xl w-48" />
        <div className="h-56 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
          <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
          <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
          <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-96 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
          <div className="lg:col-span-4 h-96 bg-gray-200 dark:bg-slate-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 px-4 space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white">Customer Not Found</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          The requested customer record does not exist or has been removed from the directory.
        </p>
        <button
          type="button"
          onClick={() => navigate('/admin/customers')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#ff6452] hover:bg-[#e55342] text-white font-bold rounded-2xl text-xs transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers Directory</span>
        </button>
      </div>
    );
  }

  const isAccountDisabled = customer.account_status === 'disabled';
  const isAccountOnHold = customer.account_status === 'on_hold';
  const isAccountActive = customer.account_status === 'active';

  return (
    <div className="max-w-7xl mx-auto space-y-7 p-4 sm:p-6 lg:p-8">
      {/* 1. Navigation & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/customers')}
            className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 px-4 py-2.5 rounded-2xl transition-all shadow-2xs hover:border-gray-300 dark:hover:border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Directory</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500 font-medium">
            <span>Customers</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-900 dark:text-white font-bold truncate max-w-xs">
              {customer.fullName || 'Customer Details'}
            </span>
          </div>
        </div>

        {/* Quick Shortcut to Status Controls */}
        <button
          type="button"
          onClick={scrollToStatusControls}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 text-xs font-bold transition-all shadow-2xs cursor-pointer"
        >
          <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Manage Account &amp; Status Controls</span>
        </button>
      </div>

      {/* 2. Executive Customer Profile & Status Hero Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-slate-800">
          {/* Avatar and Identity */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-[#ff6452] to-[#e04533] text-white flex items-center justify-center text-2xl sm:text-3xl font-black shadow-md">
                {customer.fullName ? customer.fullName[0].toUpperCase() : 'C'}
              </div>
              {/* Floating status dot */}
              <div
                className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center ${
                  isAccountDisabled
                    ? 'bg-red-500 text-white'
                    : isAccountOnHold
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-500 text-white'
                }`}
                title={`Status: ${customer.account_status}`}
              >
                {isAccountDisabled ? (
                  <Ban className="w-3.5 h-3.5" />
                ) : isAccountOnHold ? (
                  <PauseCircle className="w-3.5 h-3.5" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
              </div>
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 dark:text-white truncate">
                  {customer.fullName || 'Registered Customer'}
                </h1>

                {/* Customer Spend Tier Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${analytics.tier.bg} ${analytics.tier.color} ${analytics.tier.border}`}
                >
                  <Award className="w-3.5 h-3.5" />
                  {analytics.tier.label}
                </span>

                {/* Account Role Badge */}
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
                  {customer.role}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500 dark:text-slate-400 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  Member since {formatDateOnly(customer.createdAt)}
                </span>
                {customer.last_sign_in_at ? (
                  <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    Last login {formatDateTime(customer.last_sign_in_at)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-gray-400 dark:text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    Never signed in
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Prominent Status Controls Highlight */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 dark:text-slate-500">
                Account Status:
              </span>
              {isAccountDisabled ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-black bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-900/60 shadow-2xs">
                  <Ban className="w-4 h-4 text-red-600 dark:text-red-400" />
                  Account Disabled
                </span>
              ) : isAccountOnHold ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900/60 shadow-2xs">
                  <PauseCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Account On Hold
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900/60 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Active &amp; Verified
                </span>
              )}
            </div>

            {/* Quick Status Action Button */}
            <button
              type="button"
              onClick={scrollToStatusControls}
              className="text-xs font-bold text-[#ff6452] dark:text-[#ff7867] hover:underline flex items-center gap-1"
            >
              <span>Change account permissions &amp; status</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Warning Banner if Account is Disabled or On Hold */}
        {(isAccountDisabled || isAccountOnHold) && (
          <div
            className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isAccountDisabled
                ? 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200'
                : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 shrink-0">
                <AlertTriangle
                  className={`w-5 h-5 ${isAccountDisabled ? 'text-red-600' : 'text-amber-600'}`}
                />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-black">
                  {isAccountDisabled
                    ? 'Customer purchasing and checkout access are completely disabled.'
                    : 'Customer checkout is temporarily placed on hold.'}
                </p>
                {customer.disabled_reason && (
                  <p className="text-xs opacity-90 mt-0.5 font-medium">
                    Reason recorded: <span className="font-bold">{customer.disabled_reason}</span>
                  </p>
                )}
                {customer.disabled_at && (
                  <p className="text-[11px] opacity-75 mt-0.5">
                    Flagged on {formatDateTime(customer.disabled_at)}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={scrollToStatusControls}
              className="self-start sm:self-center px-4 py-2 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold shadow-2xs border border-current hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              Update Account Status
            </button>
          </div>
        )}

        {/* Contact & Technical Reference Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Email */}
          <div className="bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 dark:text-slate-400">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                <span>Email Address</span>
              </div>
              <p
                className="text-xs font-bold text-gray-900 dark:text-white truncate font-mono mt-0.5"
                title={customer.email}
              >
                {customer.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopyEmail(customer.email)}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 rounded-lg hover:bg-gray-200/60 dark:hover:bg-slate-700 transition-colors shrink-0"
              title="Copy email"
            >
              {copiedEmail ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Phone */}
          <div className="bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 dark:text-slate-400">
              <Phone className="w-3.5 h-3.5 text-indigo-500" />
              <span>Phone Number</span>
            </div>
            <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">
              {customer.phone && customer.phone !== '-' ? customer.phone : 'Not provided'}
            </p>
          </div>

          {/* Demographics: Age & Gender */}
          <div className="bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 dark:text-slate-400">
              <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Age &amp; Gender</span>
            </div>
            <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">
              {customer.age ? `${customer.age} yrs` : 'Age: N/A'} • {customer.gender || 'Gender: N/A'}
            </p>
          </div>

          {/* Member Registration */}
          <div className="bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Registration Date</span>
            </div>
            <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">
              {formatDateOnly(customer.createdAt)}
            </p>
          </div>

          {/* Customer UUID */}
          <div className="bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 dark:text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Customer ID</span>
              </div>
              <p
                className="text-xs font-bold text-gray-900 dark:text-white font-mono truncate mt-0.5"
                title={customer.id}
              >
                {customer.id}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopyId(customer.id)}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 rounded-lg hover:bg-gray-200/60 dark:hover:bg-slate-700 transition-colors shrink-0"
              title="Copy Customer ID"
            >
              {copiedId ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Customer Lifetime Value (LTV) & Purchasing Analytics Bento Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#ff6452]" />
            <h2 className="text-lg font-black text-gray-900 dark:text-white">
              Lifetime Value &amp; Financial Overview
            </h2>
          </div>
          <span className="text-xs font-bold text-gray-400 dark:text-slate-500">
            Real-time calculation from verified orders
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Lifetime Value (LTV) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-[#ff6452]/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                Lifetime Value (LTV)
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {STORE_CONFIG.STORE_CURRENCY}
                {analytics.ltv.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                Total realized revenue from paid purchases
              </p>
            </div>
          </div>

          {/* Metric 2: Purchase Volume & Orders */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                Purchase Volume
              </span>
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {analytics.paidCount} Paid
                </span>
                {' • '}
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {analytics.deliveredCount} Delivered
                </span>
                {analytics.pendingCount > 0 && (
                  <>
                    {' • '}
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      {analytics.pendingCount} In-flight
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Metric 3: Average Order Value (AOV) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                Average Order Value
              </span>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {STORE_CONFIG.STORE_CURRENCY}
                {analytics.aov.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                Average spending per paid checkout
              </p>
            </div>
          </div>

          {/* Metric 4: Total Items & Latest Activity */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                Items &amp; Activity
              </span>
              <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {analytics.totalItems} {analytics.totalItems === 1 ? 'Unit' : 'Units'}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium truncate">
                {analytics.lastOrder
                  ? `Last order: ${formatDateOnly(analytics.lastOrder.created_at)}`
                  : 'No orders logged yet'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Restructured Two-Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Primary Column (7 of 12 cols): Purchase History & Orders Feed */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Purchase History Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-gray-100 dark:border-slate-800 shadow-xs space-y-6">
            {/* Header & Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#ff6452]/10 text-[#ff6452] flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                      Purchase History &amp; Orders
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                      {orders.length}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Chronological ledger of customer purchases, delivery statuses, and invoices.
                  </p>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            {orders.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {/* Status Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-50 dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setOrderFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      orderFilter === 'all'
                        ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    All ({orders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderFilter('paid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      orderFilter === 'paid'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Paid ({analytics.paidCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderFilter('delivered')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      orderFilter === 'delivered'
                        ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Delivered ({analytics.deliveredCount})
                  </button>
                  {analytics.pendingCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setOrderFilter('pending')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        orderFilter === 'pending'
                          ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-2xs'
                          : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      In-Flight ({analytics.pendingCount})
                    </button>
                  )}
                </div>

                {/* Search Input */}
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by ID or item..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff6452]/20 focus:border-[#ff6452]"
                  />
                </div>
              </div>
            )}

            {/* Orders Feed */}
            {orders.length === 0 ? (
              <div className="p-10 text-center bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-gray-100 dark:border-slate-800 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-400 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-gray-900 dark:text-white">
                    No Purchase History Yet
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                    This customer has not placed any store orders since registering on{' '}
                    {formatDateOnly(customer.createdAt)}.
                  </p>
                </div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2">
                <p className="text-xs font-bold text-gray-600 dark:text-slate-300">
                  No orders match the selected filter or search query.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOrderFilter('all');
                    setOrderSearch('');
                  }}
                  className="text-xs text-[#ff6452] font-bold hover:underline"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredOrders.map((order) => {
                  const itemCount =
                    order.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;

                  return (
                    <div
                      key={order.id}
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                      className="group p-5 bg-white dark:bg-slate-900 hover:bg-gray-50/80 dark:hover:bg-slate-800/60 border border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 rounded-2xl transition-all cursor-pointer shadow-2xs space-y-3.5"
                    >
                      {/* Top Row: Order ID, Badges, Amount */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-xs sm:text-sm font-black text-gray-900 dark:text-white group-hover:text-[#ff6452] transition-colors">
                            #{order.order_number || order.id}
                          </span>
                          <OrderStatusBadge status={order.status} />
                          <PaymentStatusBadge status={order.payment_status} />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                            {STORE_CONFIG.STORE_CURRENCY}
                            {order.total_amount?.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          <span className="p-1.5 rounded-xl bg-gray-50 dark:bg-slate-800 group-hover:bg-[#ff6452] group-hover:text-white text-gray-400 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>

                      {/* Items Preview */}
                      {order.items && order.items.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex flex-wrap gap-2">
                            {order.items.slice(0, 3).map((item, idx) => (
                              <span
                                key={item.id || idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/60 text-[11px] text-gray-700 dark:text-slate-300 font-medium truncate max-w-[280px]"
                              >
                                <span className="font-black text-gray-900 dark:text-white">
                                  {item.quantity}x
                                </span>
                                <span className="truncate">{item.product_name}</span>
                              </span>
                            ))}
                            {order.items.length > 3 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-xl bg-gray-100 dark:bg-slate-800 text-[10px] font-bold text-gray-500 dark:text-slate-400">
                                +{order.items.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bottom Row: Timestamp, Item count, Payment method */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-slate-800/80 text-[11px] text-gray-400 dark:text-slate-500">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(order.created_at)}
                          </span>
                          <span>•</span>
                          <span>
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          </span>
                        </div>

                        {order.payment_method && (
                          <span className="font-medium text-gray-600 dark:text-slate-400">
                            Method: {order.payment_method}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Account & Login Information Section (Auth Record) */}
          <AdminCustomerAccountInfoCard customer={customer} />
        </div>

        {/* Right / Sidebar Column (5 of 12 cols): Profile & Status Controls */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Prominently Placed Customer Account Status & Permissions Control Card */}
          <AdminCustomerAccountControlCard
            customer={customer}
            onCustomerUpdated={(updated) => setCustomer(updated)}
          />

          {/* Customer Referral & Rewards Controls */}
          <AdminCustomerReferralCard
            customer={customer}
            onCustomerUpdated={(updated) => setCustomer(updated)}
          />
        </div>
      </div>
    </div>
  );
};
