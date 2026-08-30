import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  ShoppingBag,
  Eye,
  ShieldCheck,
  Mail,
  Phone,
  Gift,
  AlertTriangle,
  EyeOff,
  Share2,
  Sparkles,
  Ban,
  Lock,
  CheckCircle2,
  Snowflake,
  PauseCircle,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Customer, CustomerAccountStatus } from '../../types';
import { STORE_CONFIG } from '../../constants/config';
import { AdminReferralCommissionsQueue } from '../../components/admin/AdminReferralCommissionsQueue';
import { CustomerStatusModal } from '../../components/admin/CustomerStatusModal';
import { DeleteCustomerModal } from '../../components/admin/DeleteCustomerModal';
import { BulkCustomerStatusModal } from '../../components/admin/BulkCustomerStatusModal';
import { BulkDeleteCustomerModal } from '../../components/admin/BulkDeleteCustomerModal';
import { useShop } from '../../context/ShopContext';

export const AdminCustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useShop();

  const [activeTab, setActiveTab] = useState<'directory' | 'referral_commissions'>('directory');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'on_hold' | 'disabled' | 'banned' | 'frozen_earnings'
  >('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [readyCommissionsCount, setReadyCommissionsCount] = useState<number>(0);

  // Checkbox multi-select state
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Single customer modals state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [statusModalTargetStatus, setStatusModalTargetStatus] = useState<CustomerAccountStatus>('on_hold');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // Bulk action modals state
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState<boolean>(false);
  const [bulkStatusTarget, setBulkStatusTarget] = useState<CustomerAccountStatus>('disabled');
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);

  const fetchCustomers = async () => {
    setIsLoading(true);
    const data = await adminService.getCustomers(searchQuery);
    setCustomers(data);
    setIsLoading(false);
  };

  const fetchCommissionsCount = async () => {
    try {
      const comms = await adminService.getReferralCommissions();
      const ready = comms.filter((c) => c.status === 'ready_for_allocation').length;
      setReadyCommissionsCount(ready);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchCommissionsCount();

    const handleStatusEvent = () => {
      fetchCustomers();
    };
    window.addEventListener('kud_customer_status_changed', handleStatusEvent);
    return () => {
      window.removeEventListener('kud_customer_status_changed', handleStatusEvent);
    };
  }, [searchQuery]);

  const isCustomerOnHold = (cust: Customer): boolean => {
    return cust.accountStatus === 'on_hold' || cust.status === 'on_hold';
  };

  const isCustomerDisabled = (cust: Customer): boolean => {
    return (
      cust.accountStatus === 'disabled' ||
      cust.status === 'disabled' ||
      (cust.isDisabled === true && !isCustomerOnHold(cust))
    );
  };

  const isCustomerActive = (cust: Customer): boolean => {
    return !isCustomerOnHold(cust) && !isCustomerDisabled(cust);
  };

  const isCustomerBanned = (cust: Customer): boolean => {
    return cust.isReferralBanned === true || cust.referralStatus === 'banned';
  };

  const isCustomerFrozen = (cust: Customer): boolean => {
    return Boolean(cust.isEarningsFrozen);
  };

  const filteredCustomers = customers.filter((cust) => {
    if (filterStatus === 'active') return isCustomerActive(cust);
    if (filterStatus === 'on_hold') return isCustomerOnHold(cust);
    if (filterStatus === 'disabled') return isCustomerDisabled(cust);
    if (filterStatus === 'banned') return isCustomerBanned(cust);
    if (filterStatus === 'frozen_earnings') return isCustomerFrozen(cust);
    return true;
  });

  const activeCount = customers.filter(isCustomerActive).length;
  const onHoldCount = customers.filter(isCustomerOnHold).length;
  const disabledCount = customers.filter(isCustomerDisabled).length;
  const bannedCount = customers.filter(isCustomerBanned).length;
  const frozenEarningsCount = customers.filter(isCustomerFrozen).length;

  // Selected customers list
  const selectedCustomers = customers.filter((c) => selectedCustomerIds.includes(c.id));
  const isAllFilteredSelected =
    filteredCustomers.length > 0 &&
    filteredCustomers.every((c) => selectedCustomerIds.includes(c.id));
  const isSomeFilteredSelected =
    filteredCustomers.some((c) => selectedCustomerIds.includes(c.id)) && !isAllFilteredSelected;

  const toggleSelectCustomer = (id: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      // Unselect all visible in current filter
      const filteredIds = new Set(filteredCustomers.map((c) => c.id));
      setSelectedCustomerIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      // Select all visible in current filter
      const currentSet = new Set(selectedCustomerIds);
      filteredCustomers.forEach((c) => currentSet.add(c.id));
      setSelectedCustomerIds(Array.from(currentSet));
    }
  };

  const clearSelection = () => {
    setSelectedCustomerIds([]);
  };

  const handleOpenBulkStatusModal = (targetStatus: CustomerAccountStatus) => {
    if (selectedCustomerIds.length === 0) {
      showToast('Please select at least one customer account', 'error');
      return;
    }
    setBulkStatusTarget(targetStatus);
    setIsBulkStatusModalOpen(true);
  };

  const handleOpenBulkDeleteModal = () => {
    if (selectedCustomerIds.length === 0) {
      showToast('Please select at least one customer account to delete', 'error');
      return;
    }
    setIsBulkDeleteModalOpen(true);
  };

  const handleBulkUpdateStatus = async (targetStatus: CustomerAccountStatus, reason: string) => {
    if (selectedCustomerIds.length === 0) return;
    setIsActionLoading(true);
    try {
      const res = await adminService.bulkUpdateCustomerAccountStatus(
        selectedCustomerIds,
        targetStatus,
        reason
      );
      if (res.updatedCount > 0) {
        showToast(
          targetStatus === 'active'
            ? `Successfully reactivated ${res.updatedCount} customer account(s)`
            : targetStatus === 'on_hold'
            ? `Successfully placed ${res.updatedCount} customer account(s) on hold`
            : `Successfully disabled ${res.updatedCount} customer account(s)`,
          'success'
        );
      }
      if (res.failedCount > 0) {
        showToast(`${res.failedCount} account(s) could not be updated`, 'error');
      }
      setIsBulkStatusModalOpen(false);
      clearSelection();
      await fetchCustomers();
    } catch (err: any) {
      showToast(err?.message || 'Error updating status in bulk', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBulkDeleteCustomers = async () => {
    if (selectedCustomerIds.length === 0) return;
    setIsActionLoading(true);
    try {
      const res = await adminService.bulkDeleteCustomerAccounts(selectedCustomerIds);
      if (res.deletedCount > 0) {
        showToast(
          `Successfully deleted ${res.deletedCount} customer account(s). Transaction records preserved for compliance.`,
          'success'
        );
      }
      if (res.failedCount > 0) {
        showToast(`${res.failedCount} account(s) could not be deleted`, 'error');
      }
      setIsBulkDeleteModalOpen(false);
      clearSelection();
      await fetchCustomers();
    } catch (err: any) {
      showToast(err?.message || 'Error deleting accounts in bulk', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOpenStatusModal = (customer: Customer, targetStatus: CustomerAccountStatus) => {
    setSelectedCustomer(customer);
    setStatusModalTargetStatus(targetStatus);
    setIsStatusModalOpen(true);
  };

  const handleOpenDeleteModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  const handleUpdateStatus = async (newStatus: CustomerAccountStatus, reason: string) => {
    if (!selectedCustomer) return;
    setIsActionLoading(true);
    try {
      const res = await adminService.updateCustomerAccountStatus(
        selectedCustomer.id,
        newStatus,
        reason
      );
      if (res.success) {
        showToast(
          newStatus === 'active'
            ? `Account reactivated for ${selectedCustomer.fullName || 'customer'}`
            : newStatus === 'on_hold'
            ? `Account placed on hold for ${selectedCustomer.fullName || 'customer'}`
            : `Account disabled for ${selectedCustomer.fullName || 'customer'}`,
          'success'
        );
        setIsStatusModalOpen(false);
        setSelectedCustomer(null);
        await fetchCustomers();
      } else {
        showToast(res.error || 'Failed to update account status', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error updating status', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    setIsActionLoading(true);
    try {
      const res = await adminService.deleteCustomerAccount(selectedCustomer.id);
      if (res.success) {
        showToast(res.message, 'success');
        setIsDeleteModalOpen(false);
        setSelectedCustomer(null);
        await fetchCustomers();
      } else {
        showToast(res.error || 'Failed to delete customer', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error deleting customer', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Main View Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {activeTab === 'directory' ? 'Customer Directory' : 'Referral Commission Allocations'}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {activeTab === 'directory'
              ? 'Manage registered customers, place accounts on hold, disable or reactivate privileges, and delete accounts safely.'
              : 'Review qualifying monthly purchases (min. 2 orders required) and allocate referral commissions to inviter customers.'}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-gray-100 dark:bg-slate-800 rounded-2xl self-start sm:self-auto shadow-2xs">
          <button
            id="tab-customer-directory"
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'directory'
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-gray-500" />
            <span>Customers ({customers.length})</span>
          </button>

          <button
            id="tab-referral-commissions-queue"
            type="button"
            onClick={() => setActiveTab('referral_commissions')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'referral_commissions'
                ? 'bg-[#16a34a] text-white shadow-xs'
                : 'text-gray-600 dark:text-slate-300 hover:text-[#16a34a]'
            }`}
          >
            <Gift className={`w-4 h-4 ${activeTab === 'referral_commissions' ? 'text-white' : 'text-[#16a34a]'}`} />
            <span>Commissions Queue</span>
            {readyCommissionsCount > 0 && (
              <span
                className={`px-1.5 py-0.2 text-[10px] font-black rounded-full ${
                  activeTab === 'referral_commissions'
                    ? 'bg-white text-emerald-800'
                    : 'bg-[#16a34a] text-white'
                }`}
              >
                {readyCommissionsCount} Ready
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Render Selected View */}
      {activeTab === 'referral_commissions' ? (
        <AdminReferralCommissionsQueue
          onRefreshStats={() => {
            fetchCustomers();
            fetchCommissionsCount();
          }}
        />
      ) : (
        <>
          {/* Search & Filter Controls */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 border border-gray-100 dark:border-slate-700 shadow-xs flex-1 max-w-md">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search customers by name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:bg-white focus:outline-none focus:border-[#16a34a]"
                />
              </div>
            </div>

            {/* Account Status Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 dark:bg-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'
                }`}
              >
                All ({customers.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterStatus === 'active'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-gray-500 hover:text-emerald-600'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Active ({activeCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('on_hold')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterStatus === 'on_hold'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-gray-500 hover:text-amber-600'
                }`}
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>On Hold ({onHoldCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('disabled')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterStatus === 'disabled'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'text-gray-500 hover:text-red-600'
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Disabled ({disabledCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('banned')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterStatus === 'banned'
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'text-gray-500 hover:text-rose-600'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Referral Banned ({bannedCount})</span>
              </button>
            </div>
          </div>

          {/* Bulk Actions Floating/Sticky Bar */}
          {selectedCustomerIds.length > 0 && (
            <div
              id="bulk-customer-actions-bar"
              className="bg-gray-900 dark:bg-slate-800 text-white rounded-2xl p-3.5 sm:p-4 shadow-xl border border-gray-800 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-gray-800 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-[#ff6452]">
                  {selectedCustomerIds.length}
                </span>
                <span className="text-xs font-bold text-gray-200">
                  {selectedCustomerIds.length === 1
                    ? '1 customer account selected'
                    : `${selectedCustomerIds.length} customer accounts selected`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenBulkStatusModal('on_hold')}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Place On Hold</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenBulkStatusModal('disabled')}
                  className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Disable Accounts</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenBulkStatusModal('active')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reactivate</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenBulkDeleteModal}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </button>

                <button
                  type="button"
                  onClick={clearSelection}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Deselect All"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Customers List Content */}
          {isLoading ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-gray-100 dark:border-slate-700 animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded-xl w-1/4" />
              <div className="h-16 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
              <div className="h-16 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 border border-gray-100 dark:border-slate-700 text-center space-y-3">
              <Users className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-base font-bold text-gray-900 dark:text-white">No customers found</p>
              <p className="text-xs text-gray-400">Try refining your search query or status filter.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-xs overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 dark:bg-slate-900/60 text-gray-400 dark:text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-100 dark:border-slate-700">
                    <tr>
                      <th className="py-3.5 pl-6 pr-2 w-10">
                        <input
                          type="checkbox"
                          checked={isAllFilteredSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isSomeFilteredSelected;
                          }}
                          onChange={toggleSelectAllFiltered}
                          aria-label="Select all customers"
                          className="w-4 h-4 rounded text-[#ff6452] focus:ring-[#ff6452] border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer"
                        />
                      </th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-6">Contact Email</th>
                      <th className="py-3.5 px-6">Orders &amp; Spent</th>
                      <th className="py-3.5 px-6">Account Status</th>
                      <th className="py-3.5 px-6">Referral Program</th>
                      <th className="py-3.5 px-6 text-right">Account Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700 font-medium text-gray-800 dark:text-slate-200">
                    {filteredCustomers.map((cust) => {
                      const onHold = isCustomerOnHold(cust);
                      const disabled = isCustomerDisabled(cust);
                      const active = !onHold && !disabled;
                      const refBanned = isCustomerBanned(cust);
                      const isSelected = selectedCustomerIds.includes(cust.id);

                      return (
                        <tr
                          key={cust.id}
                          className={`hover:bg-gray-50/50 dark:hover:bg-slate-750 transition-colors cursor-pointer ${
                            isSelected ? 'bg-orange-50/40 dark:bg-slate-750/70' : ''
                          }`}
                          onClick={() => navigate(`/admin/customers/${cust.id}`)}
                        >
                          {/* Checkbox Column */}
                          <td
                            className="py-4 pl-6 pr-2 w-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectCustomer(cust.id)}
                              aria-label={`Select ${cust.fullName || cust.email}`}
                              className="w-4 h-4 rounded text-[#ff6452] focus:ring-[#ff6452] border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer"
                            />
                          </td>

                          {/* Customer Name + Quick Flag */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 flex items-center justify-center font-black text-xs shrink-0">
                                {cust.fullName ? cust.fullName[0].toUpperCase() : 'C'}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 dark:text-white text-sm">
                                  {cust.fullName || 'Registered Customer'}
                                </div>
                                <span className="text-[10px] text-gray-400 block mt-0.5">
                                  Joined {new Date(cust.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Email & Phone */}
                          <td className="py-4 px-6">
                            <span className="text-gray-600 dark:text-slate-400 font-mono text-[11px] block">
                              {cust.email}
                            </span>
                            {cust.phone && (
                              <span className="text-gray-400 text-[10px] block mt-0.5">
                                {cust.phone}
                              </span>
                            )}
                          </td>

                          {/* Orders & Spent */}
                          <td className="py-4 px-6">
                            <div className="font-bold text-gray-900 dark:text-white">
                              {STORE_CONFIG.STORE_CURRENCY}
                              {cust.totalSpent.toLocaleString()}
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {cust.orderCount} order{cust.orderCount !== 1 ? 's' : ''}
                            </span>
                          </td>

                          {/* Account Status Badge */}
                          <td className="py-4 px-6">
                            {disabled ? (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800/80 shadow-2xs">
                                  <Ban className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                                  <span>Disabled</span>
                                </span>
                                <p className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-0.5 font-semibold">
                                  Purchasing blocked
                                </p>
                              </div>
                            ) : onHold ? (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 shadow-2xs">
                                  <PauseCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                  <span>On Hold</span>
                                </span>
                                <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5 font-semibold">
                                  Orders suspended
                                </p>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 shadow-2xs">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span>Active</span>
                                </span>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  Full privileges
                                </p>
                              </div>
                            )}
                          </td>

                          {/* Referral Program Status */}
                          <td className="py-4 px-6">
                            {refBanned ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 rounded-md border border-rose-200">
                                Banned
                              </span>
                            ) : (
                              <div className="font-extrabold text-[#16a34a] font-mono text-xs">
                                {STORE_CONFIG.STORE_CURRENCY}
                                {(cust.referralBalance ?? 0).toLocaleString()}
                                <span className="text-[10px] text-gray-400 font-normal block">
                                  {cust.referralCount ?? 0} invites
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-4 px-6 text-right">
                            <div
                              className="flex items-center justify-end gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {active ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenStatusModal(cust, 'on_hold')}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                                    title="Place Account on Hold"
                                  >
                                    Hold
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenStatusModal(cust, 'disabled')}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800 transition-colors cursor-pointer"
                                    title="Disable Account"
                                  >
                                    Disable
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenStatusModal(cust, 'active')}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                                  title="Reactivate Customer Account"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Reactivate</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenDeleteModal(cust)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Permanently Delete Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => navigate(`/admin/customers/${cust.id}`)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-[#ff6452] hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                title="View Customer Profile"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700">
                {filteredCustomers.map((cust) => {
                  const onHold = isCustomerOnHold(cust);
                  const disabled = isCustomerDisabled(cust);
                  const active = !onHold && !disabled;
                  const isSelected = selectedCustomerIds.includes(cust.id);

                  return (
                    <div
                      key={cust.id}
                      onClick={() => navigate(`/admin/customers/${cust.id}`)}
                      className={`p-4 space-y-3 hover:bg-gray-50/50 dark:hover:bg-slate-750 transition-colors cursor-pointer ${
                        isSelected ? 'bg-orange-50/40 dark:bg-slate-750/70' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="pt-0.5"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectCustomer(cust.id)}
                              aria-label={`Select ${cust.fullName || cust.email}`}
                              className="w-4 h-4 rounded text-[#ff6452] focus:ring-[#ff6452] border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer"
                            />
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white text-sm block">
                              {cust.fullName || 'Registered User'}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              Joined {new Date(cust.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div>
                          {disabled ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 rounded-md border border-red-200">
                              <Ban className="w-2.5 h-2.5" />
                              DISABLED
                            </span>
                          ) : onHold ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-md border border-amber-200">
                              <PauseCircle className="w-2.5 h-2.5" />
                              ON HOLD
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-md border border-emerald-200">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              ACTIVE
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 dark:text-slate-400 space-y-1 font-mono text-[11px]">
                        <p className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span>{cust.email}</span>
                        </p>
                        {cust.phone && (
                          <p className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{cust.phone}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700 text-xs">
                        <div>
                          <span className="font-semibold text-gray-500 dark:text-slate-400">{cust.orderCount} Orders</span>
                          <span className="font-black text-gray-900 dark:text-white ml-2">
                            {STORE_CONFIG.STORE_CURRENCY}
                            {cust.totalSpent.toLocaleString()}
                          </span>
                        </div>

                        {/* Mobile Quick Action Buttons */}
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {active ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenStatusModal(cust, 'on_hold')}
                                className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded"
                              >
                                Hold
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenStatusModal(cust, 'disabled')}
                                className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded"
                              >
                                Disable
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(cust, 'active')}
                              className="px-2 py-0.5 text-[10px] font-black bg-emerald-600 text-white rounded"
                            >
                              Reactivate
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(cust)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Single Customer Action Modals */}
      <CustomerStatusModal
        isOpen={isStatusModalOpen}
        customer={selectedCustomer}
        initialStatus={statusModalTargetStatus}
        onClose={() => {
          setIsStatusModalOpen(false);
          setSelectedCustomer(null);
        }}
        onConfirm={handleUpdateStatus}
        isLoading={isActionLoading}
      />

      <DeleteCustomerModal
        isOpen={isDeleteModalOpen}
        customer={selectedCustomer}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedCustomer(null);
        }}
        onConfirm={handleDeleteCustomer}
        isLoading={isActionLoading}
      />

      {/* Bulk Action Modals */}
      <BulkCustomerStatusModal
        isOpen={isBulkStatusModalOpen}
        customers={selectedCustomers}
        initialStatus={bulkStatusTarget}
        onClose={() => setIsBulkStatusModalOpen(false)}
        onConfirm={handleBulkUpdateStatus}
        isLoading={isActionLoading}
      />

      <BulkDeleteCustomerModal
        isOpen={isBulkDeleteModalOpen}
        customers={selectedCustomers}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDeleteCustomers}
        isLoading={isActionLoading}
      />
    </div>
  );
};
