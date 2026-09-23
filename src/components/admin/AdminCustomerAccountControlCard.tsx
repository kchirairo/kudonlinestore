import React, { useState } from 'react';
import {
  ShieldCheck,
  PauseCircle,
  Ban,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Clock,
  FileText,
  Lock,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Customer, CustomerAccountStatus } from '../../types';
import { adminService } from '../../services/adminService';
import { CustomerStatusModal } from './CustomerStatusModal';
import { DeleteCustomerModal } from './DeleteCustomerModal';
import { useShop } from '../../context/ShopContext';
import { useNavigate } from 'react-router-dom';

interface AdminCustomerAccountControlCardProps {
  customer: Customer;
  onCustomerUpdated: (customer: Customer) => void;
}

export const AdminCustomerAccountControlCard: React.FC<AdminCustomerAccountControlCardProps> = ({
  customer,
  onCustomerUpdated,
}) => {
  const navigate = useNavigate();
  const { showToast } = useShop();

  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [statusModalTargetStatus, setStatusModalTargetStatus] = useState<CustomerAccountStatus>('on_hold');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isHeld = customer.account_status === 'on_hold';
  const isDisabled = customer.account_status === 'disabled';
  const isActive = customer.account_status === 'active';

  const currentStatus: CustomerAccountStatus = customer.account_status;

  const handleOpenStatusModal = (targetStatus: CustomerAccountStatus) => {
    setStatusModalTargetStatus(targetStatus);
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async (newStatus: CustomerAccountStatus, reason: string) => {
    setIsLoading(true);
    try {
      const res = await adminService.updateCustomerAccountStatus(customer.id, newStatus, reason);
      if (res.success) {
        showToast(
          newStatus === 'active'
            ? 'Customer account successfully reactivated'
            : newStatus === 'on_hold'
            ? 'Customer account placed on hold'
            : 'Customer account disabled',
          'success'
        );
        setIsStatusModalOpen(false);

        // Fetch fresh customer details
        const updated = await adminService.getCustomerById(customer.id);
        if (updated) {
          onCustomerUpdated(updated);
        }
      } else {
        showToast(res.error || 'Failed to update account status', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error updating account status', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.deleteCustomerAccount(customer.id);
      if (res.success) {
        showToast(res.message, 'success');
        setIsDeleteModalOpen(false);
        navigate('/admin/customers');
      } else {
        showToast(res.error || 'Failed to delete customer', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error deleting customer', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="customer-status-controls"
      className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-gray-100 dark:border-slate-800 shadow-xs space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isDisabled
                ? 'bg-red-50 text-red-600 dark:bg-red-950/80 dark:text-red-400'
                : isHeld
                ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400'
                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400'
            }`}
          >
            {isDisabled ? (
              <Ban className="w-5 h-5" />
            ) : isHeld ? (
              <PauseCircle className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white">
              Account Status &amp; Store Access Controls
            </h3>
            <p className="text-xs text-gray-400 dark:text-slate-400">
              Manage store purchasing privileges, account hold/disable status, or permanently delete the account.
            </p>
          </div>
        </div>

        {/* Current Status Pill */}
        <div>
          {isDisabled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900/60 shadow-2xs">
              <Ban className="w-4 h-4 text-red-600" />
              <span>Account Disabled</span>
            </span>
          ) : isHeld ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 shadow-2xs">
              <PauseCircle className="w-4 h-4 text-amber-600" />
              <span>Account On Hold</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Active Account</span>
            </span>
          )}
        </div>
      </div>

      {/* Status Details / Reason Display */}
      {(!isActive && customer.disabled_reason) && (
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 font-bold">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Status Change Reason:
            </span>
            {customer.disabled_at && (
              <span className="text-[10px] font-normal">
                Updated {new Date(customer.disabled_at).toLocaleString()}
              </span>
            )}
          </div>
          <p className="font-semibold text-gray-900 dark:text-white pl-5">
            "{customer.disabled_reason}"
          </p>
        </div>
      )}

      {/* Restriction Overview Callout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 space-y-1">
          <span className="font-bold text-gray-700 dark:text-slate-300 block">Enforced Store Controls</span>
          <p className="text-gray-500 dark:text-slate-400 text-[11px] leading-relaxed">
            {isActive
              ? 'Customer is permitted to browse, add products to cart, place orders, and make payments.'
              : 'Adding products to cart, placing orders, and completing transactions are strictly blocked for this customer.'}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 space-y-1">
          <span className="font-bold text-gray-700 dark:text-slate-300 block">Order History &amp; Compliance</span>
          <p className="text-gray-500 dark:text-slate-400 text-[11px] leading-relaxed">
            Past order records ({customer.orderCount} orders) remain intact in store records and invoices for tax &amp; audit compliance.
          </p>
        </div>
      </div>

      {/* Admin Action Buttons */}
      <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Status Changing Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isActive ? (
            <>
              <button
                type="button"
                onClick={() => handleOpenStatusModal('on_hold')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Place Account on Hold</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenStatusModal('disabled')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-800 hover:bg-red-100 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800/80 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Ban className="w-3.5 h-3.5 text-red-600" />
                <span>Disable Account</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleOpenStatusModal('active')}
                className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reactivate Account</span>
              </button>

              {isHeld && (
                <button
                  type="button"
                  onClick={() => handleOpenStatusModal('disabled')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-800 hover:bg-red-100 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800/80 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Ban className="w-3.5 h-3.5 text-red-600" />
                  <span>Disable Account</span>
                </button>
              )}

              {isDisabled && (
                <button
                  type="button"
                  onClick={() => handleOpenStatusModal('on_hold')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Place On Hold Instead</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Permanent Deletion Button */}
        <div>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer flex items-center gap-1.5 border border-transparent hover:border-red-200 dark:hover:border-red-800"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Permanently Delete Account</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <CustomerStatusModal
        isOpen={isStatusModalOpen}
        customer={customer}
        initialStatus={statusModalTargetStatus}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleUpdateStatus}
        isLoading={isLoading}
      />

      <DeleteCustomerModal
        isOpen={isDeleteModalOpen}
        customer={customer}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteCustomer}
        isLoading={isLoading}
      />
    </div>
  );
};
