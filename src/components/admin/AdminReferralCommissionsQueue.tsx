import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Gift,
  ArrowRight,
  TrendingUp,
  ShoppingBag,
  Filter,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  Plus,
  RefreshCw,
  Info,
  Mail,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import {
  ReferralCommissionRecord,
  ReferralCommissionStatus,
  Customer,
} from '../../types';
import { STORE_CONFIG } from '../../constants/config';

interface AdminReferralCommissionsQueueProps {
  onRefreshStats?: () => void;
}

export const AdminReferralCommissionsQueue: React.FC<AdminReferralCommissionsQueueProps> = ({
  onRefreshStats,
}) => {
  const [commissions, setCommissions] = useState<ReferralCommissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<ReferralCommissionStatus | 'all'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Allocation Modal State
  const [allocatingRecord, setAllocatingRecord] = useState<ReferralCommissionRecord | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('50');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isSubmittingAllocation, setIsSubmittingAllocation] = useState<boolean>(false);
  const [isOverrideMode, setIsOverrideMode] = useState<boolean>(false);

  // Decline Modal State
  const [decliningRecord, setDecliningRecord] = useState<ReferralCommissionRecord | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('Client did not reach minimum 2 monthly purchases requirement.');
  const [isSubmittingDecline, setIsSubmittingDecline] = useState<boolean>(false);

  // Batch Allocation State
  const [isBatchAllocating, setIsBatchAllocating] = useState<boolean>(false);

  // New Connection Modal State
  const [isNewConnectionModalOpen, setIsNewConnectionModalOpen] = useState<boolean>(false);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [selectedReferrerId, setSelectedReferrerId] = useState<string>('');
  const [selectedReferredId, setSelectedReferredId] = useState<string>('');
  const [customRefCode, setCustomRefCode] = useState<string>('');
  const [isSubmittingNewConn, setIsSubmittingNewConn] = useState<boolean>(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchCommissions = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getReferralCommissions();
      setCommissions(data);
    } catch (err) {
      console.error('Failed to fetch referral commissions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  const toggleExpandOrders = (id: string) => {
    setExpandedOrders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Distinct evaluation months in dataset
  const availableMonths = Array.from(new Set(commissions.map((c) => c.evaluationMonth).filter(Boolean))).sort().reverse();

  // Metrics
  const readyCount = commissions.filter((c) => c.status === 'ready_for_allocation').length;
  const readyTotalAmount = commissions
    .filter((c) => c.status === 'ready_for_allocation')
    .reduce((sum, c) => sum + (c.commissionAmount || 50), 0);
  const pendingCount = commissions.filter((c) => c.status === 'pending_qualification').length;
  const allocatedCount = commissions.filter((c) => c.status === 'allocated').length;
  const allocatedTotalAmount = commissions
    .filter((c) => c.status === 'allocated')
    .reduce((sum, c) => sum + (c.commissionAmount || 50), 0);

  // Filtered List
  const filteredCommissions = commissions.filter((rec) => {
    if (selectedStatus !== 'all' && rec.status !== selectedStatus) {
      return false;
    }
    if (selectedMonth !== 'all' && rec.evaluationMonth !== selectedMonth) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        rec.referrerName.toLowerCase().includes(q) ||
        rec.referrerEmail.toLowerCase().includes(q) ||
        rec.referredClientName.toLowerCase().includes(q) ||
        rec.referredClientEmail.toLowerCase().includes(q) ||
        rec.referralCodeUsed?.toLowerCase().includes(q) ||
        rec.monthlyOrders?.some((o) => o.orderId.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Handle Single Allocation
  const handleOpenAllocateModal = (record: ReferralCommissionRecord, override = false) => {
    setAllocatingRecord(record);
    setCustomAmount(String(record.commissionAmount || 50));
    setIsOverrideMode(override);
    setAdminNotes(
      override
        ? `Manual Admin Exception: Approved by admin despite ${record.monthlyPurchasesCount}/2 purchases.`
        : `Verified ${record.monthlyPurchasesCount} purchases in ${record.evaluationMonth}. Commission approved.`
    );
  };

  const handleConfirmAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingRecord) return;

    setIsSubmittingAllocation(true);
    const amountNum = Number(customAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Please enter a valid commission amount.', 'error');
      setIsSubmittingAllocation(false);
      return;
    }

    const res = await adminService.allocateReferralCommission(allocatingRecord.id, {
      customAmount: amountNum,
      adminEmail: 'admin@kudstore.com',
      adminNotes: adminNotes.trim(),
    });

    setIsSubmittingAllocation(false);
    if (res.success) {
      showToast(
        `Successfully allocated ${STORE_CONFIG.STORE_CURRENCY}${amountNum} commission to ${allocatingRecord.referrerName}! Resend email notification dispatched to ${allocatingRecord.referrerEmail || 'customer'}.`,
        'success'
      );
      setAllocatingRecord(null);
      fetchCommissions();
      onRefreshStats?.();
    } else {
      showToast(res.error || 'Failed to allocate commission', 'error');
    }
  };

  // Handle Decline
  const handleOpenDeclineModal = (record: ReferralCommissionRecord) => {
    setDecliningRecord(record);
    setDeclineReason(
      record.monthlyPurchasesCount < 2
        ? `Referred customer made only ${record.monthlyPurchasesCount} of 2 required monthly purchases in ${record.evaluationMonth}.`
        : 'Commission declined following account review.'
    );
  };

  const handleConfirmDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decliningRecord) return;

    setIsSubmittingDecline(true);
    const res = await adminService.declineReferralCommission(
      decliningRecord.id,
      declineReason.trim(),
      'admin@kudstore.com'
    );
    setIsSubmittingDecline(false);

    if (res.success) {
      showToast(`Referral commission for ${decliningRecord.referredClientName} was marked as declined.`, 'success');
      setDecliningRecord(null);
      fetchCommissions();
    } else {
      showToast(res.error || 'Failed to decline commission', 'error');
    }
  };

  // Handle Batch Allocation
  const handleBatchAllocateQualified = async () => {
    const qualifiedIds = commissions
      .filter((c) => c.status === 'ready_for_allocation')
      .map((c) => c.id);

    if (qualifiedIds.length === 0) {
      showToast('No qualified commissions ready for allocation.', 'error');
      return;
    }

    setIsBatchAllocating(true);
    const res = await adminService.batchAllocateReferralCommissions(qualifiedIds, 'admin@kudstore.com');
    setIsBatchAllocating(false);

    if (res.success) {
      showToast(`Batch allocation complete! ${res.count} commissions were credited and Resend notification emails dispatched.`, 'success');
      fetchCommissions();
      onRefreshStats?.();
    } else {
      showToast(res.error || 'Batch allocation failed', 'error');
    }
  };

  // Handle Open New Connection Modal
  const handleOpenNewConnectionModal = async () => {
    const custs = await adminService.getCustomers();
    setCustomersList(custs);
    if (custs.length >= 2) {
      setSelectedReferrerId(custs[0].id);
      setSelectedReferredId(custs[1].id);
    }
    setIsNewConnectionModalOpen(true);
  };

  const handleConfirmCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReferrerId || !selectedReferredId) {
      showToast('Please select both a referrer and a referred customer.', 'error');
      return;
    }
    if (selectedReferrerId === selectedReferredId) {
      showToast('A customer cannot refer themselves.', 'error');
      return;
    }

    setIsSubmittingNewConn(true);
    const res = await adminService.createReferralConnection(
      selectedReferrerId,
      selectedReferredId,
      customRefCode.trim() || undefined
    );
    setIsSubmittingNewConn(false);

    if (res.success) {
      showToast('New referral connection successfully tracked!', 'success');
      setIsNewConnectionModalOpen(false);
      setCustomRefCode('');
      fetchCommissions();
    } else {
      showToast(res.error || 'Failed to create referral connection', 'error');
    }
  };

  return (
    <div className="space-y-6" id="admin-referral-commissions-section">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2 text-xs font-bold transition-all animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
              : 'bg-red-950 text-red-200 border-red-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Mandatory Business Rule Highlight Card */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 rounded-3xl border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#16a34a] text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                  Referral Commission Allocation Policy
                </h3>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider rounded-full">
                  2 Purchases Rule Active
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                A referred client <strong className="text-gray-900 dark:text-white font-black">must make purchases at least twice in a month</strong> for the commission to be allocated to the one who invited them by the admin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {readyCount > 0 && (
              <button
                id="batch-allocate-all-btn"
                type="button"
                onClick={handleBatchAllocateQualified}
                disabled={isBatchAllocating}
                className="px-3.5 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isBatchAllocating
                    ? 'Allocating...'
                    : `Allocate All Qualified (${readyCount})`}
                </span>
              </button>
            )}

            <button
              id="new-referral-connection-btn"
              type="button"
              onClick={handleOpenNewConnectionModal}
              className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-white border border-gray-200 dark:border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Link Referral</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Ready to Allocate */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl border border-emerald-200 dark:border-emerald-900/50 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Ready to Allocate
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#16a34a] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {readyCount}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              ({STORE_CONFIG.STORE_CURRENCY}{readyTotalAmount})
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Referred clients with ≥ 2 monthly orders</p>
        </div>

        {/* Pending Qualification */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pending Orders (0-1)
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {pendingCount}
            </span>
            <span className="text-xs text-gray-400">in progress</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Awaiting 2nd purchase in active month</p>
        </div>

        {/* Total Allocated */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Commissions Paid
            </span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {STORE_CONFIG.STORE_CURRENCY}{allocatedTotalAmount}
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400">({allocatedCount} approved)</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Total reward balance credited by admins</p>
        </div>

        {/* Active Evaluation Month */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Evaluation Cycle
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-base font-black text-gray-900 dark:text-white block">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Auto-evaluated against live store orders</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-1.5 border border-gray-100 dark:border-slate-700 shadow-xs flex-1 max-w-md">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by referrer, invited friend, code, order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white focus:outline-hidden focus:border-[#16a34a]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent outline-hidden cursor-pointer"
            >
              <option value="all">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-2xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === 'all'
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All ({commissions.length})
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus('ready_for_allocation')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedStatus === 'ready_for_allocation'
                  ? 'bg-[#16a34a] text-white shadow-xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              <span>Ready to Allocate</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">{readyCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus('pending_qualification')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === 'pending_qualification'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Pending ({pendingCount})
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus('allocated')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === 'allocated'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Allocated ({allocatedCount})
            </button>
          </div>

          <button
            type="button"
            onClick={fetchCommissions}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Commissions List Content */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-gray-100 dark:border-slate-700 animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded-xl w-1/4" />
          <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
          <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
        </div>
      ) : filteredCommissions.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 border border-gray-100 dark:border-slate-700 text-center space-y-3">
          <Users className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-base font-bold text-gray-900 dark:text-white">No referral records found</p>
          <p className="text-xs text-gray-400">
            No referral commission records match the active filter or search criteria.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 dark:bg-slate-900/60 text-gray-400 dark:text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-100 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-5">Referrer (Inviter)</th>
                  <th className="py-3.5 px-5">Referred Friend</th>
                  <th className="py-3.5 px-5">Monthly Purchases (≥ 2 Req.)</th>
                  <th className="py-3.5 px-5">Commission</th>
                  <th className="py-3.5 px-5">Allocation Status</th>
                  <th className="py-3.5 px-5 text-right">Admin Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-slate-700 font-medium text-gray-800 dark:text-slate-200">
                {filteredCommissions.map((rec) => {
                  const isExpanded = !!expandedOrders[rec.id];
                  const hasReachedThreshold = rec.monthlyPurchasesCount >= (rec.requiredMonthlyPurchases || 2);

                  return (
                    <React.Fragment key={rec.id}>
                      <tr className="hover:bg-gray-50/50 dark:hover:bg-slate-750 transition-colors">
                        {/* Inviter Info */}
                        <td className="py-4 px-5 align-top">
                          <div className="font-bold text-gray-900 dark:text-white text-xs">
                            {rec.referrerName}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-slate-400 font-mono">
                            {rec.referrerEmail}
                          </div>
                          {rec.referralCodeUsed && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[9px] rounded-md border border-emerald-200 dark:border-emerald-900">
                              Code: {rec.referralCodeUsed}
                            </span>
                          )}
                        </td>

                        {/* Referred Client Info */}
                        <td className="py-4 px-5 align-top">
                          <div className="font-bold text-gray-900 dark:text-white text-xs">
                            {rec.referredClientName}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-slate-400 font-mono">
                            {rec.referredClientEmail}
                          </div>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            Referred in {rec.evaluationMonth || 'Active Month'}
                          </span>
                        </td>

                        {/* Monthly Purchase Progress & Orders Accordion */}
                        <td className="py-4 px-5 align-top">
                          <div className="space-y-1.5 max-w-xs">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                                <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />
                                <span>{rec.monthlyPurchasesCount} of {rec.requiredMonthlyPurchases || 2} Purchases</span>
                              </span>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  hasReachedThreshold
                                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                                }`}
                              >
                                {hasReachedThreshold
                                  ? '✓ Requirement Met'
                                  : `${(rec.requiredMonthlyPurchases || 2) - rec.monthlyPurchasesCount} more needed`}
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  hasReachedThreshold ? 'bg-[#16a34a]' : 'bg-amber-500'
                                }`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (rec.monthlyPurchasesCount / (rec.requiredMonthlyPurchases || 2)) * 100
                                  )}%`,
                                }}
                              />
                            </div>

                            {/* Collapsible Orders Detail Button */}
                            {rec.monthlyOrders && rec.monthlyOrders.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleExpandOrders(rec.id)}
                                className="text-[11px] font-bold text-[#16a34a] hover:text-[#15803d] flex items-center gap-1 cursor-pointer pt-0.5"
                              >
                                <span>
                                  {isExpanded
                                    ? 'Hide verified orders'
                                    : `View ${rec.monthlyOrders.length} monthly order${rec.monthlyOrders.length > 1 ? 's' : ''}`}
                                </span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Commission Amount */}
                        <td className="py-4 px-5 align-top">
                          <div className="font-extrabold text-gray-900 dark:text-white text-sm font-mono">
                            {STORE_CONFIG.STORE_CURRENCY}
                            {(rec.commissionAmount || 50).toFixed(2)}
                          </div>
                          <span className="text-[10px] text-gray-400">Referrer Reward</span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-5 align-top">
                          {rec.status === 'ready_for_allocation' && (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] rounded-full shadow-2xs">
                                <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
                                Ready to Allocate
                              </span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-1 font-semibold">
                                2+ purchases verified!
                              </span>
                            </div>
                          )}

                          {rec.status === 'pending_qualification' && (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold text-[11px] rounded-full">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Pending Orders
                              </span>
                              <span className="text-[10px] text-gray-400 block mt-1">
                                Must purchase ≥ 2 times
                              </span>
                            </div>
                          )}

                          {rec.status === 'allocated' && (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-bold text-[11px] rounded-full">
                                <Check className="w-3 h-3 text-purple-600 stroke-[3]" />
                                Allocated by Admin
                              </span>
                              {rec.allocatedAt && (
                                <span className="text-[10px] text-gray-400 block">
                                  {new Date(rec.allocatedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          )}

                          {rec.status === 'declined' && (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 font-bold text-[11px] rounded-full">
                                <X className="w-3 h-3 text-red-600" />
                                Declined
                              </span>
                              {rec.declineReason && (
                                <span className="text-[10px] text-red-500 block mt-0.5 truncate max-w-[140px]" title={rec.declineReason}>
                                  {rec.declineReason}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Admin Action Buttons */}
                        <td className="py-4 px-5 text-right align-top">
                          <div className="flex items-center justify-end gap-1.5">
                            {rec.status === 'ready_for_allocation' && (
                              <button
                                id={`allocate-commission-btn-${rec.id}`}
                                type="button"
                                onClick={() => handleOpenAllocateModal(rec, false)}
                                className="px-3 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Allocate {STORE_CONFIG.STORE_CURRENCY}{rec.commissionAmount || 50}</span>
                              </button>
                            )}

                            {rec.status === 'pending_qualification' && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAllocateModal(rec, true)}
                                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                                  title="Force allocate commission even with < 2 purchases"
                                >
                                  Override
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeclineModal(rec)}
                                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                                  title="Decline qualification"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {rec.status === 'allocated' && (
                              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Credited
                              </span>
                            )}

                            {rec.status === 'declined' && (
                              <button
                                type="button"
                                onClick={() => handleOpenAllocateModal(rec, true)}
                                className="text-[11px] text-gray-500 hover:text-gray-900 dark:hover:text-white font-bold underline cursor-pointer"
                              >
                                Re-evaluate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Orders Drawer */}
                      {isExpanded && rec.monthlyOrders && rec.monthlyOrders.length > 0 && (
                        <tr className="bg-gray-50/70 dark:bg-slate-900/70">
                          <td colSpan={6} className="p-4 px-6 border-b border-gray-100 dark:border-slate-700">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-slate-300">
                                <span>Verified Purchases by {rec.referredClientName} in {rec.evaluationMonth}:</span>
                                <span className="text-[10px] text-gray-400">
                                  {rec.monthlyOrders.length} order{rec.monthlyOrders.length > 1 ? 's' : ''} on record
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                                {rec.monthlyOrders.map((ord, idx) => (
                                  <div
                                    key={ord.orderId || idx}
                                    className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs text-xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between font-mono font-bold text-gray-900 dark:text-white">
                                      <span className="text-[#16a34a]">#{ord.orderId}</span>
                                      <span>{STORE_CONFIG.STORE_CURRENCY}{ord.totalAmount}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-slate-400">
                                      <span>{new Date(ord.orderDate).toLocaleDateString()}</span>
                                      <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded">
                                        {ord.status}
                                      </span>
                                    </div>
                                    {ord.itemsSummary && (
                                      <p className="text-[10px] text-gray-600 dark:text-slate-300 truncate">
                                        {ord.itemsSummary}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commission Allocation Modal Dialog */}
      {allocatingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-slate-700 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-[#16a34a] flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    {isOverrideMode ? 'Override & Allocate Commission' : 'Allocate Referral Commission'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Credit reward balance to {allocatingRecord.referrerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAllocatingRecord(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary Details */}
            <div className="p-3.5 bg-gray-50 dark:bg-slate-900/60 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Inviter (Beneficiary):</span>
                <span className="font-bold text-gray-900 dark:text-white">{allocatingRecord.referrerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Referred Client:</span>
                <span className="font-bold text-gray-900 dark:text-white">{allocatingRecord.referredClientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Purchases in {allocatingRecord.evaluationMonth}:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {allocatingRecord.monthlyPurchasesCount} of {allocatingRecord.requiredMonthlyPurchases || 2} Orders
                </span>
              </div>
              <div className="pt-1.5 border-t border-gray-200/60 dark:border-slate-800 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Resend email alert will be dispatched to <strong>{allocatingRecord.referrerEmail || 'referrer'}</strong></span>
              </div>
            </div>

            <form onSubmit={handleConfirmAllocate} className="space-y-4">
              {/* Commission Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  Commission Amount ({STORE_CONFIG.STORE_CURRENCY})
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:bg-white focus:outline-hidden focus:border-[#16a34a]"
                />
              </div>

              {/* Admin Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  Admin Audit Notes
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Verified 2 purchases in month. Approved."
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white focus:bg-white focus:outline-hidden focus:border-[#16a34a]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAllocatingRecord(null)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-commission-allocation-btn"
                  type="submit"
                  disabled={isSubmittingAllocation}
                  className="px-5 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  {isSubmittingAllocation
                    ? 'Crediting Balance...'
                    : `Confirm & Allocate ${STORE_CONFIG.STORE_CURRENCY}${customAmount}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decline Commission Modal Dialog */}
      {decliningRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/70 text-red-600 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    Decline Referral Commission
                  </h3>
                  <p className="text-xs text-gray-400">
                    Mark commission for {decliningRecord.referredClientName} as declined
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDecliningRecord(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDecline} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  Decline Reason
                </label>
                <textarea
                  rows={3}
                  required
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white focus:bg-white focus:outline-hidden focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDecliningRecord(null)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDecline}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {isSubmittingDecline ? 'Declining...' : 'Decline Commission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Link Referral Connection Modal */}
      {isNewConnectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-slate-700 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-[#16a34a] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    Link Referral Connection
                  </h3>
                  <p className="text-xs text-gray-400">
                    Connect an invited client to a referrer for monthly order evaluation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewConnectionModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCreateConnection} className="space-y-4">
              {/* Select Referrer */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  Select Inviter (Referrer)
                </label>
                <select
                  value={selectedReferrerId}
                  onChange={(e) => setSelectedReferrerId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:bg-white focus:outline-hidden focus:border-[#16a34a]"
                >
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName || 'Customer'} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Referred Friend */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  Select Invited Friend (Referred Client)
                </label>
                <select
                  value={selectedReferredId}
                  onChange={(e) => setSelectedReferredId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:bg-white focus:outline-hidden focus:border-[#16a34a]"
                >
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName || 'Customer'} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Code */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  Referral Code Used (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AISHA-KUD-88"
                  value={customRefCode}
                  onChange={(e) => setCustomRefCode(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono text-gray-900 dark:text-white focus:bg-white focus:outline-hidden focus:border-[#16a34a]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewConnectionModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewConn}
                  className="px-5 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  {isSubmittingNewConn ? 'Tracking Connection...' : 'Create Connection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
