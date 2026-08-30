import React, { useState } from 'react';
import {
  X,
  Headphones,
  Mail,
  Phone,
  MessageSquare,
  AlertTriangle,
  PauseCircle,
  Ban,
  Send,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { STORE_CONFIG } from '../constants/config';

interface AccountDisabledSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountDisabledSupportModal: React.FC<AccountDisabledSupportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, isAccountDisabled, accountStatus, disabledReason, generalSettings, showToast } = useShop();

  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSent, setIsSent] = useState<boolean>(false);

  if (!isOpen) return null;

  const storeEmail =
    generalSettings?.contactEmail || 'support@kudstore.co.za';
  const storePhone = generalSettings?.contactPhone || '+27 11 234 5678';
  const rawPhone = storePhone.replace(/[^0-9]/g, '') || '27112345678';

  const defaultSubject = encodeURIComponent(
    `[Account Review Request] ${accountStatus === 'on_hold' ? 'Account On Hold' : 'Account Disabled'} - ${user?.email || 'Customer'}`
  );
  const defaultBody = encodeURIComponent(
    `Hello KUD Store Support Team,\n\nMy account (${user?.email || 'N/A'}, ID: ${user?.id || 'N/A'}) is currently ${
      accountStatus === 'on_hold' ? 'on hold' : 'disabled'
    }.\n\nReason noted: "${disabledReason || 'Under administrative review'}"\n\nI would like to request an account review so I can resume purchasing.\n\nThank you,\n${user?.fullName || 'Customer'}`
  );

  const mailtoLink = `mailto:${storeEmail}?subject=${defaultSubject}&body=${defaultBody}`;

  const whatsappMessage = encodeURIComponent(
    `Hello KUD Store Support, my account (${user?.email || 'Customer'}, ID: ${user?.id?.slice(0, 8) || 'N/A'}) is currently ${
      accountStatus === 'on_hold' ? 'on hold' : 'disabled'
    }. Please assist me with an account review.`
  );
  const whatsappLink = `https://wa.me/${rawPhone}?text=${whatsappMessage}`;

  const handleSendTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast('Please type your inquiry or explanation', 'error');
      return;
    }

    setIsSubmitting(true);
    // Simulate support ticket submission / local notification dispatch
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);
    setIsSent(true);
    showToast('Support ticket submitted successfully! Our compliance team will review your account.', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-6 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              accountStatus === 'on_hold'
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400'
                : 'bg-red-100 text-red-600 dark:bg-red-950/80 dark:text-red-400'
            }`}
          >
            <Headphones className="w-6 h-6" />
          </div>

          <div className="space-y-1 pr-6">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              Customer Support &amp; Account Review
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Need assistance with your {accountStatus === 'on_hold' ? 'account hold' : 'account status'}? Contact our customer resolutions desk.
            </p>
          </div>
        </div>

        {/* Account Restriction Status Summary */}
        <div
          className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
            accountStatus === 'on_hold'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-200'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-950 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {accountStatus === 'on_hold' ? (
              <PauseCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <Ban className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>
              {accountStatus === 'on_hold'
                ? 'Your Account is Currently On Hold'
                : 'Your Account is Currently Disabled'}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-90">
            {disabledReason
              ? `Reason: "${disabledReason}". Checkout and new order placement are paused until resolved.`
              : 'Checkout and new purchases are currently suspended on this account. Past order records remain fully safe.'}
          </p>
        </div>

        {/* Quick Contact Options */}
        <div className="space-y-2">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-slate-400">
            Direct Support Channels
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* WhatsApp */}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 flex items-center gap-3 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold block truncate">WhatsApp Desk</span>
                <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 block truncate">
                  Instant message review
                </span>
              </div>
            </a>

            {/* Email */}
            <a
              href={mailtoLink}
              className="p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 flex items-center gap-3 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold block truncate">Email Support</span>
                <span className="text-[10px] text-blue-700/80 dark:text-blue-400/80 block truncate">
                  {storeEmail}
                </span>
              </div>
            </a>
          </div>
        </div>

        {/* In-App Direct Appeal / Ticket Form */}
        <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
          {isSent ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                Appeal Submitted Successfully
              </h4>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                Our support team has logged your inquiry. You will receive an update at <strong>{user?.email}</strong> shortly.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendTicket} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  Send Direct Message to Store Admin
                </label>
                <span className="text-[10px] text-gray-400 font-mono">ID: {user?.id?.slice(0, 8) || 'User'}</span>
              </div>

              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain the situation or request account review..."
                className="w-full p-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#16a34a]"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-gray-400">
                  Typical response time: &lt; 2 hours
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#ff6452] hover:bg-[#ff523d] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-[#ff6452]/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Sending...' : 'Submit Appeal'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
