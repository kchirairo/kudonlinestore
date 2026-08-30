import React from 'react';
import { Mail, MessageSquare, Phone, HelpCircle, ArrowUpRight } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { STORE_CONFIG } from '../constants/config';

interface CustomerOrderHelpCardProps {
  orderId?: string;
  orderNumber?: string | number;
  className?: string;
  compact?: boolean;
}

export const CustomerOrderHelpCard: React.FC<CustomerOrderHelpCardProps> = ({
  orderId,
  orderNumber,
  className = '',
  compact = false,
}) => {
  const { generalSettings } = useShop();

  const supportEmail = generalSettings?.contactEmail || STORE_CONFIG.CONTACT_EMAIL;
  const rawWhatsapp = generalSettings?.whatsappSupport || STORE_CONFIG.WHATSAPP_SUPPORT;
  const cleanWhatsapp = rawWhatsapp.replace(/[^0-9]/g, '');
  const supportPhone = generalSettings?.contactPhone || STORE_CONFIG.CONTACT_PHONE;
  const storeName = generalSettings?.storeName || STORE_CONFIG.STORE_NAME;
  const heading = generalSettings?.supportHeading || 'Need help with an order?';

  const orderIdentifier = orderNumber ? `#${orderNumber}` : orderId ? `#${orderId}` : '';
  const emailSubject = orderIdentifier
    ? `Support Inquiry for Order ${orderIdentifier} - ${storeName}`
    : `Customer Support Inquiry - ${storeName}`;

  const emailBody = orderIdentifier
    ? `Hello ${storeName} Support,\n\nI need assistance regarding my order ${orderIdentifier}.\n\nDetails:`
    : `Hello ${storeName} Support,\n\nI need assistance with:`;

  const whatsappText = orderIdentifier
    ? `Hi ${storeName}, I need help with my Order ${orderIdentifier}.`
    : `Hi ${storeName}, I have an inquiry regarding my account/order.`;

  const emailHref = `mailto:${supportEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
  const whatsappHref = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(whatsappText)}`;

  return (
    <div
      id="customer-order-help-support-card"
      className={`bg-gradient-to-br from-blue-50/90 via-sky-50/50 to-indigo-50/60 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-800/80 rounded-3xl p-5 sm:p-6 border border-blue-100/90 dark:border-blue-900/40 shadow-xs transition-all ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <h3 className="font-black text-gray-900 dark:text-white text-sm sm:text-base tracking-tight">
              {heading}
            </h3>
          </div>

          <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed pl-9 sm:pl-0">
            Contact {storeName} support directly at{' '}
            <a
              href={emailHref}
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
            >
              <span>{supportEmail}</span>
            </a>{' '}
            or message via WhatsApp at{' '}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5"
            >
              <span>{rawWhatsapp}</span>
            </a>
            .
          </p>

          {generalSettings?.supportSubtext && (
            <p className="text-[11px] text-gray-500 dark:text-slate-400 pl-9 sm:pl-0">
              {generalSettings.supportSubtext}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
          <a
            href={emailHref}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-2xl border border-blue-200 dark:border-slate-700 transition-all text-center inline-flex items-center justify-center gap-2 shadow-2xs cursor-pointer group"
          >
            <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
            <span>Email Support</span>
          </a>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl transition-all text-center inline-flex items-center justify-center gap-2 shadow-2xs cursor-pointer group"
          >
            <MessageSquare className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span>WhatsApp</span>
            <ArrowUpRight className="w-3 h-3 opacity-70" />
          </a>

          {supportPhone && !compact && (
            <a
              href={`tel:${supportPhone.replace(/[^0-9+]/g, '')}`}
              className="hidden lg:inline-flex px-3 py-2.5 bg-white/80 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs font-semibold rounded-2xl border border-gray-200 dark:border-slate-700 transition-all items-center justify-center gap-1.5"
              title={`Call support: ${supportPhone}`}
            >
              <Phone className="w-3.5 h-3.5 text-gray-500" />
              <span>Call</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
