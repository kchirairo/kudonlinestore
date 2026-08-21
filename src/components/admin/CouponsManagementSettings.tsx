import React, { useState, useEffect, useMemo } from 'react';
import {
  Tag,
  Plus,
  Search,
  Check,
  Copy,
  Edit2,
  Trash2,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Percent,
  DollarSign,
  Truck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  X,
} from 'lucide-react';
import { Coupon, CouponDiscountType } from '../../types';
import { adminService } from '../../services/adminService';
import { useShop } from '../../context/ShopContext';
import { STORE_CONFIG } from '../../constants/config';

export const CouponsManagementSettings: React.FC = () => {
  const { showToast, refreshCoupons: syncGlobalCoupons } = useShop();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [discountType, setDiscountType] = useState<CouponDiscountType>('fixed');
  const [discountValue, setDiscountValue] = useState<string>('50');
  const [minOrderAmount, setMinOrderAmount] = useState<string>('150');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>('');
  const [hasExpiry, setHasExpiry] = useState<boolean>(false);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [hasUsageLimit, setHasUsageLimit] = useState<boolean>(false);
  const [usageLimit, setUsageLimit] = useState<string>('100');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Quick Test Simulator State
  const [testSubtotal, setTestSubtotal] = useState<string>('450');
  const [testCouponCode, setTestCouponCode] = useState<string>('');
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    message: string;
    discount: number;
    finalTotal: number;
  } | null>(null);

  // Load Coupons
  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getCoupons();
      setCoupons(data || []);
    } catch (err) {
      console.error('Failed to load coupons:', err);
      showToast('Failed to load coupons from database', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCopyCode = (coupon: Coupon) => {
    navigator.clipboard.writeText(coupon.code);
    setCopiedId(coupon.id);
    showToast(`Copied code "${coupon.code}" to clipboard!`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    const nextStatus = !coupon.isActive;
    try {
      const res = await adminService.toggleCouponStatus(coupon.id, nextStatus);
      if (res.success) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === coupon.id ? { ...c, isActive: nextStatus } : c))
        );
        showToast(`Coupon "${coupon.code}" is now ${nextStatus ? 'active' : 'paused'}.`, 'success');
        syncGlobalCoupons?.();
      } else {
        showToast(res.error || 'Failed to update coupon status', 'error');
      }
    } catch (err) {
      showToast('Failed to toggle coupon status', 'error');
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!window.confirm(`Are you sure you want to permanently delete coupon "${coupon.code}"?`)) {
      return;
    }

    try {
      const res = await adminService.deleteCoupon(coupon.id);
      if (res.success) {
        setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
        showToast(`Deleted coupon "${coupon.code}"`, 'success');
        syncGlobalCoupons?.();
      } else {
        showToast(res.error || 'Failed to delete coupon', 'error');
      }
    } catch (err) {
      showToast('Failed to delete coupon', 'error');
    }
  };

  const openCreateModal = () => {
    setEditingCouponId(null);
    setCode('');
    setDescription('');
    setDiscountType('fixed');
    setDiscountValue('50');
    setMinOrderAmount('150');
    setMaxDiscountAmount('');
    setHasExpiry(false);
    setExpiryDate('');
    setHasUsageLimit(false);
    setUsageLimit('100');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCouponId(coupon.id);
    setCode(coupon.code);
    setDescription(coupon.description || '');
    setDiscountType(coupon.discountType);
    setDiscountValue(String(coupon.discountValue));
    setMinOrderAmount(String(coupon.minOrderAmount || 0));
    setMaxDiscountAmount(coupon.maxDiscountAmount ? String(coupon.maxDiscountAmount) : '');
    setHasExpiry(Boolean(coupon.expiryDate));
    setExpiryDate(coupon.expiryDate ? coupon.expiryDate.split('T')[0] : '');
    setHasUsageLimit(Boolean(coupon.usageLimit));
    setUsageLimit(coupon.usageLimit ? String(coupon.usageLimit) : '100');
    setIsActive(coupon.isActive);
    setIsModalOpen(true);
  };

  const generateRandomCode = () => {
    const prefixes = ['SAVE', 'FLASH', 'KUD', 'PROMO', 'DEAL', 'VIP', 'SUPER'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(10 + Math.random() * 90);
    setCode(`${prefix}${number}`);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      showToast('Please provide a coupon code.', 'error');
      return;
    }

    const valNum = Number(discountValue);
    if (isNaN(valNum) || valNum < 0) {
      showToast('Please enter a valid discount amount.', 'error');
      return;
    }

    if (discountType === 'percentage' && (valNum <= 0 || valNum > 100)) {
      showToast('Percentage discount must be between 1% and 100%.', 'error');
      return;
    }

    const minNum = Number(minOrderAmount) || 0;
    const maxNum = maxDiscountAmount ? Number(maxDiscountAmount) : undefined;
    const limitNum = hasUsageLimit && usageLimit ? Number(usageLimit) : undefined;
    const expDate = hasExpiry && expiryDate ? new Date(expiryDate).toISOString() : undefined;

    setIsSaving(true);
    try {
      if (editingCouponId) {
        const res = await adminService.updateCoupon(editingCouponId, {
          code: cleanCode,
          description: description.trim(),
          discountType,
          discountValue: valNum,
          minOrderAmount: minNum,
          maxDiscountAmount: maxNum,
          expiryDate: expDate,
          usageLimit: limitNum,
          isActive,
        });

        if (res.success && res.data) {
          setCoupons((prev) =>
            prev.map((c) => (c.id === editingCouponId ? res.data! : c))
          );
          showToast(`Coupon "${cleanCode}" updated successfully!`, 'success');
          setIsModalOpen(false);
          syncGlobalCoupons?.();
        } else {
          showToast(res.error || 'Failed to update coupon', 'error');
        }
      } else {
        const res = await adminService.createCoupon({
          code: cleanCode,
          description: description.trim(),
          discountType,
          discountValue: valNum,
          minOrderAmount: minNum,
          maxDiscountAmount: maxNum,
          expiryDate: expDate,
          usageLimit: limitNum,
          isActive,
        });

        if (res.success && res.data) {
          setCoupons((prev) => [res.data!, ...prev]);
          showToast(`Coupon "${cleanCode}" created successfully!`, 'success');
          setIsModalOpen(false);
          syncGlobalCoupons?.();
        } else {
          showToast(res.error || 'Failed to create coupon', 'error');
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Error saving coupon', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Run quick coupon test simulator
  const handleRunSimulator = () => {
    const query = testCouponCode.trim().toUpperCase();
    const subtotal = Number(testSubtotal) || 0;

    if (!query) {
      setTestResult({
        valid: false,
        message: 'Please enter a coupon code to test.',
        discount: 0,
        finalTotal: subtotal,
      });
      return;
    }

    const matched = coupons.find((c) => c.code.toUpperCase() === query);
    if (!matched) {
      setTestResult({
        valid: false,
        message: `Coupon "${query}" was not found.`,
        discount: 0,
        finalTotal: subtotal,
      });
      return;
    }

    if (!matched.isActive) {
      setTestResult({
        valid: false,
        message: `Coupon "${matched.code}" is currently disabled / inactive.`,
        discount: 0,
        finalTotal: subtotal,
      });
      return;
    }

    if (matched.expiryDate && new Date(matched.expiryDate) < new Date()) {
      setTestResult({
        valid: false,
        message: `Coupon "${matched.code}" has expired on ${new Date(matched.expiryDate).toLocaleDateString()}.`,
        discount: 0,
        finalTotal: subtotal,
      });
      return;
    }

    if (matched.minOrderAmount && subtotal < matched.minOrderAmount) {
      setTestResult({
        valid: false,
        message: `Order subtotal (${STORE_CONFIG.STORE_CURRENCY}${subtotal}) is below the required minimum of ${STORE_CONFIG.STORE_CURRENCY}${matched.minOrderAmount}.`,
        discount: 0,
        finalTotal: subtotal,
      });
      return;
    }

    let calculatedDiscount = 0;
    if (matched.discountType === 'fixed') {
      calculatedDiscount = Math.min(subtotal, matched.discountValue);
    } else if (matched.discountType === 'percentage') {
      calculatedDiscount = Math.round(subtotal * (matched.discountValue / 100));
      if (matched.maxDiscountAmount && calculatedDiscount > matched.maxDiscountAmount) {
        calculatedDiscount = matched.maxDiscountAmount;
      }
    } else if (matched.discountType === 'free_shipping') {
      calculatedDiscount = STORE_CONFIG.DELIVERY_FEE;
    }

    setTestResult({
      valid: true,
      message: `Success! Valid coupon "${matched.code}" applies ${
        matched.discountType === 'free_shipping'
          ? 'Free Delivery'
          : `-${STORE_CONFIG.STORE_CURRENCY}${calculatedDiscount}`
      }.`,
      discount: calculatedDiscount,
      finalTotal: Math.max(0, subtotal - calculatedDiscount),
    });
  };

  // Filtered coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      const matchesSearch =
        coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (coupon.description || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter === 'active') {
        const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
        if (!coupon.isActive || isExpired) return false;
      } else if (statusFilter === 'inactive') {
        if (coupon.isActive) return false;
      } else if (statusFilter === 'expired') {
        const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
        if (!isExpired) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && coupon.discountType !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [coupons, searchQuery, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter(
      (c) => c.isActive && (!c.expiryDate || new Date(c.expiryDate) >= new Date())
    ).length;
    const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);
    return { total, active, totalRedemptions };
  }, [coupons]);

  return (
    <div className="space-y-8">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-[#ff6452] text-xs font-bold">
              <Tag className="w-3.5 h-3.5" />
              <span>Promo Engine & Discounts</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Coupons & Discount Codes
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
              Create, configure, and manipulate percentage discounts, fixed vouchers, and free shipping promos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchCoupons}
              disabled={isLoading}
              className="p-3 rounded-2xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              title="Refresh Coupons"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#ff6452] hover:bg-[#e05342] text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Coupon</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-slate-800">
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
            <span className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
              Total Coupons
            </span>
            <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {stats.total}
            </div>
            <span className="text-[11px] text-gray-500 dark:text-slate-400">
              In store database
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Active & Live
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.active}
            </div>
            <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
              Currently redeemable by shoppers
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Total Redemptions
            </span>
            <div className="text-2xl font-black text-[#ff6452] mt-1">
              {stats.totalRedemptions}
            </div>
            <span className="text-[11px] text-rose-700/80 dark:text-rose-400/80">
              Orders with promo applied
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Coupon Tester & Simulator */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-rose-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Live Checkout Simulation</span>
            </div>
            <h3 className="text-lg font-black tracking-tight">Test Coupon & Delivery Fee Calculation</h3>
            <p className="text-xs text-slate-300">
              Simulate any cart subtotal against your active coupons to verify discount accuracy before marketing campaigns.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-4 space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Test Cart Subtotal ({STORE_CONFIG.STORE_CURRENCY})</label>
            <input
              type="number"
              value={testSubtotal}
              onChange={(e) => setTestSubtotal(e.target.value)}
              placeholder="e.g. 450"
              className="w-full px-4 py-3 bg-slate-800/90 border border-slate-700 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-[#ff6452]"
            />
          </div>

          <div className="sm:col-span-5 space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Coupon Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testCouponCode}
                onChange={(e) => setTestCouponCode(e.target.value)}
                placeholder="e.g. KUD50, WELCOME10, FREESHIP"
                className="w-full px-4 py-3 bg-slate-800/90 border border-slate-700 rounded-2xl text-xs font-bold text-white uppercase focus:outline-none focus:border-[#ff6452]"
              />
              <button
                type="button"
                onClick={handleRunSimulator}
                className="px-5 py-3 bg-[#ff6452] hover:bg-[#e05342] text-white text-xs font-bold rounded-2xl transition-all flex-shrink-0"
              >
                Validate
              </button>
            </div>
          </div>

          <div className="sm:col-span-3 flex items-end">
            <div className="flex flex-wrap gap-1.5 w-full">
              {coupons.slice(0, 3).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setTestCouponCode(c.code);
                  }}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-bold text-slate-200 transition-colors"
                >
                  {c.code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Test Result Display */}
        {testResult && (
          <div
            className={`mt-5 p-4 rounded-2xl border text-xs flex items-start gap-3 transition-all ${
              testResult.valid
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
            }`}
          >
            {testResult.valid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <div className="font-bold">{testResult.message}</div>
              {testResult.valid && (
                <div className="flex items-center gap-4 text-[11px] text-slate-300 pt-1">
                  <span>Subtotal: {STORE_CONFIG.STORE_CURRENCY}{testSubtotal}</span>
                  <span>•</span>
                  <span>Discount: -{STORE_CONFIG.STORE_CURRENCY}{testResult.discount}</span>
                  <span>•</span>
                  <span className="font-black text-white">
                    Estimated Total: {STORE_CONFIG.STORE_CURRENCY}{testResult.finalTotal}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coupon code or description..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-[#ff6452]"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full sm:w-auto px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-700 dark:text-slate-300 focus:outline-none focus:border-[#ff6452]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive / Paused</option>
              <option value="expired">Expired</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-700 dark:text-slate-300 focus:outline-none focus:border-[#ff6452]"
            >
              <option value="all">All Types</option>
              <option value="fixed">Fixed (Rands)</option>
              <option value="percentage">Percentage (%)</option>
              <option value="free_shipping">Free Shipping</option>
            </select>
          </div>
        </div>

        {/* Coupons List / Cards */}
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#ff6452] animate-spin mx-auto" />
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400">Loading coupons...</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-gray-100 dark:bg-slate-800 text-gray-400 flex items-center justify-center mx-auto">
              <Tag className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-black text-gray-900 dark:text-white">No coupons found</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'No coupons match your filter criteria. Try adjusting your search query.'
                  : 'Start rewarding your shoppers with special promo codes and delivery vouchers!'}
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#ff6452] hover:bg-[#e05342] text-white text-xs font-bold transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Coupon</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {filteredCoupons.map((coupon) => {
              const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
              const isCopied = copiedId === coupon.id;

              return (
                <div
                  key={coupon.id}
                  className={`border rounded-3xl p-5 sm:p-6 transition-all relative overflow-hidden flex flex-col justify-between ${
                    !coupon.isActive || isExpired
                      ? 'bg-gray-50/70 dark:bg-slate-800/40 border-gray-200 dark:border-slate-800 opacity-80'
                      : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 shadow-xs'
                  }`}
                >
                  {/* Status Bar */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`px-3 py-1.5 rounded-xl font-black text-sm uppercase tracking-wider flex items-center gap-2 ${
                          coupon.discountType === 'percentage'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40'
                            : coupon.discountType === 'free_shipping'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-[#ff6452] border border-rose-200 dark:border-rose-900/40'
                        }`}
                      >
                        {coupon.discountType === 'percentage' && <Percent className="w-3.5 h-3.5" />}
                        {coupon.discountType === 'fixed' && <DollarSign className="w-3.5 h-3.5" />}
                        {coupon.discountType === 'free_shipping' && <Truck className="w-3.5 h-3.5" />}
                        <span>{coupon.code}</span>
                      </div>

                      <button
                        onClick={() => handleCopyCode(coupon)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        title="Copy code"
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Active Status Badge */}
                      {isExpired ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          Expired
                        </span>
                      ) : coupon.isActive ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300">
                          Paused
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="space-y-3 flex-1 mb-5">
                    <div>
                      <h4 className="text-base font-black text-gray-900 dark:text-white">
                        {coupon.discountType === 'percentage'
                          ? `${coupon.discountValue}% Discount`
                          : coupon.discountType === 'free_shipping'
                          ? '100% Free Shipping'
                          : `${STORE_CONFIG.STORE_CURRENCY}${coupon.discountValue} Off Cart`}
                      </h4>
                      {coupon.description && (
                        <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5">
                          {coupon.description}
                        </p>
                      )}
                    </div>

                    {/* Condition Tags */}
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {coupon.minOrderAmount ? (
                        <span className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-lg font-medium">
                          Min spend: {STORE_CONFIG.STORE_CURRENCY}{coupon.minOrderAmount}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-lg font-medium">
                          No minimum spend
                        </span>
                      )}

                      {coupon.maxDiscountAmount && coupon.discountType === 'percentage' && (
                        <span className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-lg font-medium">
                          Max cap: {STORE_CONFIG.STORE_CURRENCY}{coupon.maxDiscountAmount}
                        </span>
                      )}

                      {coupon.expiryDate ? (
                        <span className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-lg font-medium inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>Expires {new Date(coupon.expiryDate).toLocaleDateString()}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-lg font-medium">
                          Never expires
                        </span>
                      )}

                      {coupon.usageLimit && (
                        <span className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-lg font-medium">
                          Limit: {coupon.usageLimit} uses
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
                    <button
                      onClick={() => handleToggleStatus(coupon)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                        coupon.isActive
                          ? 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                          : 'border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                      }`}
                    >
                      {coupon.isActive ? 'Pause Code' : 'Activate Code'}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(coupon)}
                        className="p-2 rounded-xl text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                        title="Edit Coupon"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(coupon)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors"
                        title="Delete Coupon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Coupon Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full border border-gray-100 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ff6452] flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    {editingCouponId ? 'Edit Coupon Code' : 'Create New Coupon'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Configure promo rules, discounts, and minimum order requirements.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCoupon} className="p-6 space-y-5">
              {/* Code & Random Button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                    Coupon Code *
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="text-[11px] font-bold text-[#ff6452] hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Code</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FLASH30, FREESHIP, WELCOME10"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-black tracking-wider uppercase text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-[#ff6452]"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                  Description / Public Memo
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 15% OFF summer beauty essentials"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-[#ff6452]"
                />
              </div>

              {/* Discount Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                  Discount Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      discountType === 'fixed'
                        ? 'border-[#ff6452] bg-rose-50/60 dark:bg-rose-950/40 text-[#ff6452]'
                        : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Fixed (Rands)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiscountType('percentage')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      discountType === 'percentage'
                        ? 'border-[#ff6452] bg-rose-50/60 dark:bg-rose-950/40 text-[#ff6452]'
                        : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Percent className="w-4 h-4" />
                    <span>Percentage (%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiscountType('free_shipping')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      discountType === 'free_shipping'
                        ? 'border-[#ff6452] bg-rose-50/60 dark:bg-rose-950/40 text-[#ff6452]'
                        : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>Free Delivery</span>
                  </button>
                </div>
              </div>

              {/* Value & Minimum Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {discountType !== 'free_shipping' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                      {discountType === 'percentage' ? 'Percentage Discount (%)' : `Discount Value (${STORE_CONFIG.STORE_CURRENCY})`}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={discountType === 'percentage' ? 100 : undefined}
                      required
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-[#ff6452]"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                      Delivery Benefit
                    </label>
                    <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 rounded-2xl text-xs font-bold text-blue-700 dark:text-blue-300">
                      100% Free Nationwide Delivery
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                    Minimum Order Amount ({STORE_CONFIG.STORE_CURRENCY})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    placeholder="0 for no minimum"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-[#ff6452]"
                  />
                </div>
              </div>

              {/* Percentage Max Cap */}
              {discountType === 'percentage' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                    Maximum Discount Cap ({STORE_CONFIG.STORE_CURRENCY}) (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                    placeholder="e.g. 200 (Limits discount to max R200)"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-[#ff6452]"
                  />
                </div>
              )}

              {/* Expiry Date Settings */}
              <div className="space-y-3 pt-1 border-t border-gray-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                      Set Expiration Date
                    </label>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">
                      Automatically disable coupon after a specific date.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasExpiry}
                    onChange={(e) => setHasExpiry(e.target.checked)}
                    className="w-5 h-5 text-[#ff6452] rounded-lg border-gray-300 focus:ring-[#ff6452]"
                  />
                </div>

                {hasExpiry && (
                  <input
                    type="date"
                    required={hasExpiry}
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-[#ff6452]"
                  />
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
                <div>
                  <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                    Coupon Status
                  </label>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Enable this coupon for immediate redemption by shoppers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-12 h-7 rounded-full p-1 transition-colors ${
                    isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-2xl bg-[#ff6452] hover:bg-[#e05342] text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCouponId ? 'Save Changes' : 'Create Coupon'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
