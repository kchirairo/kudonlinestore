import React, { useState } from 'react';
import {
  Mail,
  ShieldCheck,
  PauseCircle,
  Ban,
  UserCheck,
  Calendar,
  LogIn,
  CheckCircle2,
  XCircle,
  Fingerprint,
  Copy,
  Check,
  KeyRound,
  Shield,
} from 'lucide-react';
import { Customer } from '../../types';

interface AdminCustomerAccountInfoCardProps {
  customer: Customer;
}

export const AdminCustomerAccountInfoCard: React.FC<AdminCustomerAccountInfoCardProps> = ({
  customer,
}) => {
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(customer.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // Ignore clipboard write failure
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(customer.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      // Ignore clipboard write failure
    }
  };

  // Format date and time using standard locale
  const formatDateTime = (isoString?: string | null): string => {
    if (!isoString) return 'Never';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'Never';
      return d.toLocaleString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatMemberSince = (isoString?: string | null): string => {
    if (!isoString) return 'Unknown';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'Unknown';
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

  // Auth account mappings:
  // Email -> email
  // Member Since -> created_at
  // Last Sign-In -> last_sign_in_at
  // Email Confirmed -> confirmed_at
  // Customer ID -> id
  const authAccount = customer.auth_account;
  const emailValue = authAccount?.email || customer.email || 'customer@kudstore.com';
  const memberSinceValue = authAccount?.created_at || customer.createdAt;
  const lastSignInValue = authAccount?.last_sign_in_at ?? customer.last_sign_in_at;
  const isConfirmed = Boolean(authAccount ? authAccount.confirmed_at : customer.confirmed_at);
  const confirmedAtValue = authAccount?.confirmed_at ?? customer.confirmed_at;

  return (
    <div
      id="admin-customer-account-login-info"
      className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-gray-100 dark:border-slate-800 shadow-xs space-y-6"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                Account &amp; Login Information
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60">
                Auth Records
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Authoritative Supabase Auth credentials, session telemetry, and verification status.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-slate-500 font-medium">
          <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>Security Definer RPC</span>
        </div>
      </div>

      {/* Account & Login Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Email */}
        <div
          id="account-info-email"
          className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-slate-400">
              <Mail className="w-4 h-4 text-indigo-500" />
              <span>Email</span>
            </div>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-gray-200/60 dark:hover:bg-slate-700 transition-colors"
              title="Copy email address"
              aria-label="Copy email address"
            >
              {copiedEmail ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p
            className="font-mono text-xs font-bold text-gray-900 dark:text-white truncate"
            title={emailValue}
          >
            {emailValue}
          </p>
        </div>

        {/* 2. Account Status (Sourced from existing profiles/customer system) */}
        <div
          id="account-info-status"
          className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1.5"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-slate-400">
            {customer.account_status === 'disabled' ? (
              <Ban className="w-4 h-4 text-red-500" />
            ) : customer.account_status === 'on_hold' ? (
              <PauseCircle className="w-4 h-4 text-amber-500" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            )}
            <span>Account Status</span>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            {customer.account_status === 'disabled' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60">
                <Ban className="w-3 h-3" />
                Disabled
              </span>
            ) : customer.account_status === 'on_hold' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                <PauseCircle className="w-3 h-3" />
                On Hold
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                <ShieldCheck className="w-3 h-3" />
                Active
              </span>
            )}
          </div>
          {customer.disabled_reason && customer.account_status !== 'active' && (
            <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate mt-1">
              Note: {customer.disabled_reason}
            </p>
          )}
        </div>

        {/* 3. Role (Sourced from existing profiles/customer system) */}
        <div
          id="account-info-role"
          className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1.5"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-slate-400">
            <UserCheck className="w-4 h-4 text-indigo-500" />
            <span>Role</span>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                customer.role === 'admin'
                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600'
              }`}
            >
              {customer.role === 'admin' ? 'Administrator' : 'Customer'}
            </span>
          </div>
        </div>

        {/* 4. Member Since (created_at from auth account) */}
        <div
          id="account-info-member-since"
          className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1.5"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-slate-400">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>Member Since</span>
          </div>
          <p className="font-bold text-xs text-gray-900 dark:text-white">
            {formatMemberSince(memberSinceValue)}
          </p>
        </div>

        {/* 5. Last Sign-In (last_sign_in_at from auth account) */}
        <div
          id="account-info-last-sign-in"
          className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1.5"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-slate-400">
            <LogIn className="w-4 h-4 text-indigo-500" />
            <span>Last Sign-In</span>
          </div>
          <div className="pt-0.5">
            {lastSignInValue ? (
              <p className="font-bold text-xs text-gray-900 dark:text-white">
                {formatDateTime(lastSignInValue)}
              </p>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-200/80 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                Never
              </span>
            )}
          </div>
        </div>

        {/* 6. Email Confirmed (confirmed_at from auth account) */}
        <div
          id="account-info-email-confirmed"
          className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1.5"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-slate-400">
            {isConfirmed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <XCircle className="w-4 h-4 text-amber-500" />
            )}
            <span>Email Confirmed</span>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            {isConfirmed ? (
              <div className="space-y-0.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Confirmed
                </span>
                {confirmedAtValue && (
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 pl-1">
                    {formatDateTime(confirmedAtValue)}
                  </p>
                )}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                <XCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                Not confirmed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 7. Customer ID (Auth Account ID = profiles.id) */}
      <div
        id="account-info-customer-id"
        className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-slate-400">
            <Fingerprint className="w-4 h-4 text-indigo-500" />
            <span>Customer ID (UUID)</span>
          </div>
          <p className="font-mono text-xs font-bold text-gray-800 dark:text-slate-200 select-all break-all">
            {customer.id}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopyId}
          className="self-start sm:self-center px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
          title="Copy customer UUID"
        >
          {copiedId ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Copied UUID</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy ID</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
