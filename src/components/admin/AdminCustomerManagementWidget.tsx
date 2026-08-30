import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  PauseCircle,
  Ban,
  ArrowRight,
  Eye,
  MoreVertical,
  Mail,
  UserCheck,
  UserX,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Customer, CustomerAccountStatus } from '../../types';
import { STORE_CONFIG } from '../../constants/config';
import { CustomerStatusModal } from './CustomerStatusModal';
import { DeleteCustomerModal } from './DeleteCustomerModal';
import { useShop } from '../../context/ShopContext';

export const AdminCustomerManagementWidget: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useShop();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [statusModalTargetStatus, setStatusModalTargetStatus] = useState<CustomerAccountStatus>('on_hold');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.warn('Failed to load customers for dashboard widget:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();

    const handleStatusEvent = () => {
      loadCustomers();
    };

    window.addEventListener('kud_customer_status_changed', handleStatusEvent);
    return () => {
      window.removeEventListener('kud_customer_status_changed', handleStatusEvent);
    };
  }, []);

  // Stats calculation
  const totalCount = customers.length;
  const onHoldCount = customers.filter(
    (c) => c.accountStatus === 'on_hold' || c.status === 'on_hold'
  ).length;
  const disabledCount = customers.filter(
    (c) =>
      c.accountStatus === 'disabled' ||
      c.status === 'disabled' ||
      (c.isDisabled && c.accountStatus !== 'on_hold')
  ).length;
  const activeCount = customers.filter(
    (c) =>
      !c.isDisabled &&
      c.accountStatus !== 'disabled' &&
      c.accountStatus !== 'on_hold' &&
      c.status !== 'disabled' &&
      c.status !== 'on_hold'
  ).length;

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
        await loadCustomers();
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
        await loadCustomers();
      } else {
        showToast(res.error || 'Failed to delete customer', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error deleting customer', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const recentCustomers = customers.slice(0, 5);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs overflow-hidden space-y-5 p-6">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
              Customer Management &amp; Account Control
            </h3>
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">
            Monitor registered customers, place accounts on hold, disable or reactivate privileges, and manage accounts.
          </p>
        </div>

        <button
          onClick={() => navigate('/admin/customers')}
          className="flex items-center gap-1.5 text-xs font-bold text-[#ff6452] hover:text-[#ff4935] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>View All Directory ({totalCount})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mini Customer Status Counter Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Profiles</span>
          <span className="text-xl font-black text-gray-900 dark:text-white mt-0.5 block">{totalCount}</span>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Active Accounts</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-xl font-black text-emerald-900 dark:text-emerald-200 mt-0.5 block">{activeCount}</span>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-100 dark:border-amber-900/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">On Hold</span>
            <PauseCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-xl font-black text-amber-900 dark:text-amber-200 mt-0.5 block">{onHoldCount}</span>
        </div>

        <div className="bg-red-50/50 dark:bg-red-950/20 p-3.5 rounded-2xl border border-red-100 dark:border-red-900/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider block">Disabled</span>
            <Ban className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <span className="text-xl font-black text-red-900 dark:text-red-200 mt-0.5 block">{disabledCount}</span>
        </div>
      </div>

      {/* Customer Quick Table */}
      {isLoading ? (
        <div className="space-y-2 py-4">
          <div className="h-12 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-12 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-12 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
      ) : recentCustomers.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 dark:bg-slate-800 rounded-2xl text-xs text-gray-400">
          No customer records found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 dark:bg-slate-800/80 text-gray-400 dark:text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Orders &amp; Spend</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Quick Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium text-gray-800 dark:text-slate-200">
              {recentCustomers.map((cust) => {
                const isHeld = cust.accountStatus === 'on_hold' || cust.status === 'on_hold';
                const isDisabled =
                  cust.accountStatus === 'disabled' ||
                  cust.status === 'disabled' ||
                  (cust.isDisabled && !isHeld);

                return (
                  <tr
                    key={cust.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 flex items-center justify-center font-black text-xs shrink-0">
                          {cust.fullName ? cust.fullName[0].toUpperCase() : 'C'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white leading-tight">
                            {cust.fullName || 'Customer Profile'}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Joined {new Date(cust.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600 dark:text-slate-400">
                      {cust.email}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {STORE_CONFIG.STORE_CURRENCY}{cust.totalSpent.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-gray-400">{cust.orderCount} orders</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {isDisabled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-900/60 shadow-2xs">
                          <Ban className="w-3 h-3 text-red-600" />
                          Disabled
                        </span>
                      ) : isHeld ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 shadow-2xs">
                          <PauseCircle className="w-3 h-3 text-amber-600" />
                          On Hold
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 shadow-2xs">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Active
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Reactivate or Hold/Disable buttons */}
                        {isDisabled || isHeld ? (
                          <button
                            type="button"
                            onClick={() => handleOpenStatusModal(cust, 'active')}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                            title="Reactivate Customer"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(cust, 'on_hold')}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                              title="Place Account on Hold"
                            >
                              Hold
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(cust, 'disabled')}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800 transition-colors cursor-pointer"
                              title="Disable Account"
                            >
                              Disable
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => navigate(`/admin/customers/${cust.id}`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#ff6452] hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="View Profile & Orders"
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
      )}

      {/* Modals */}
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
    </div>
  );
};
