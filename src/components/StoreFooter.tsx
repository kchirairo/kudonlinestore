import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, Trash2, Mail, MessageSquare, Lock, CreditCard, Truck } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { STORE_CONFIG } from '../constants/config';

export const StoreFooter: React.FC = () => {
  const { generalSettings } = useShop();

  const storeName = generalSettings?.storeName || STORE_CONFIG.STORE_NAME || 'KUD Store';
  const contactEmail = generalSettings?.contactEmail || STORE_CONFIG.CONTACT_EMAIL;
  const whatsappNumber = generalSettings?.whatsappSupport || STORE_CONFIG.WHATSAPP_SUPPORT;
  const cleanWhatsapp = whatsappNumber.replace(/[^0-9]/g, '');

  return (
    <footer
      aria-label="Store Footer and Legal Links"
      className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 pb-24 pt-10 px-4 sm:px-6 lg:px-8 transition-colors duration-200 print:hidden"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Row: Brand, Trust Badges & Navigation Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand Summary */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#ff6452] text-white font-black text-base flex items-center justify-center shadow-2xs">
                K
              </div>
              <span className="font-black text-lg tracking-tight text-gray-900 dark:text-white">
                {storeName}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed max-w-sm">
              {generalSettings?.storeDescription ||
                'South African online marketplace delivering electronics, beauty, home goods, and lifestyle essentials nationwide.'}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-semibold text-gray-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-slate-700/70">
                <CreditCard className="w-3.5 h-3.5 text-[#ff6452]" />
                <span>Yoco Secure Checkout</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-slate-700/70">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                <span>SA Nationwide Courier</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-slate-700/70">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>POPIA Protected</span>
              </span>
            </div>
          </div>

          {/* Quick Shop Links */}
          <div className="md:col-span-3 space-y-2.5">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-white">
              Shop &amp; Account
            </h2>
            <ul className="space-y-2 text-xs text-gray-600 dark:text-slate-400">
              <li>
                <Link to="/" className="hover:text-[#ff6452] transition-colors">
                  Home &amp; New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-[#ff6452] transition-colors">
                  Browse Categories
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-[#ff6452] transition-colors">
                  My Orders &amp; Tracking
                </Link>
              </li>
              <li>
                <Link to="/account" className="hover:text-[#ff6452] transition-colors">
                  My Account &amp; Settings
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal, Privacy & Help Links */}
          <div className="md:col-span-4 space-y-2.5">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 dark:text-white">
              Legal, Privacy &amp; Support
            </h2>
            <ul className="space-y-2 text-xs text-gray-600 dark:text-slate-400">
              <li>
                <Link
                  to="/privacy-policy"
                  className="inline-flex items-center gap-1.5 font-semibold text-gray-700 dark:text-slate-200 hover:text-[#ff6452] dark:hover:text-[#ff6452] transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#ff6452]" />
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/terms-and-conditions"
                  className="inline-flex items-center gap-1.5 font-semibold text-gray-700 dark:text-slate-200 hover:text-[#ff6452] dark:hover:text-[#ff6452] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[#ff6452]" />
                  <span>Terms &amp; Conditions</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/account#delete-account"
                  className="inline-flex items-center gap-1.5 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Delete Account &amp; Data</span>
                </Link>
              </li>
              <li className="pt-1 flex flex-wrap items-center gap-3">
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex items-center gap-1 text-gray-600 dark:text-slate-400 hover:text-[#ff6452] transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-[#ff6452]" />
                  <span>{contactEmail}</span>
                </a>
                <a
                  href={`https://wa.me/${cleanWhatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp Support</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Compliance Bar */}
        <div className="pt-5 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-400 dark:text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} {storeName}. All rights reserved. Republic of South Africa.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/privacy-policy" className="hover:text-gray-700 dark:hover:text-slate-300 underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms-and-conditions" className="hover:text-gray-700 dark:hover:text-slate-300 underline-offset-2 hover:underline">
              Terms &amp; Conditions
            </Link>
            <Link to="/account#delete-account" className="hover:text-rose-600 dark:hover:text-rose-400 underline-offset-2 hover:underline">
              Account Deletion
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
